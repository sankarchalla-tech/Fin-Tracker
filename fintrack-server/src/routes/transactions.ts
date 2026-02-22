import { Router, Response } from 'express';
import { db, schema } from '../db';
import { eq, and, gte, lte, desc, or, isNull, inArray } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createTransactionSchema, updateTransactionSchema, transactionFilterSchema } from '../types/validations';

const router = Router();

async function getGroupMemberIds(groupId: string): Promise<string[]> {
  const members = await db.select({ userId: schema.groupMembers.userId })
    .from(schema.groupMembers)
    .where(eq(schema.groupMembers.groupId, groupId));
  return members.map(m => m.userId);
}

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const filters = transactionFilterSchema.parse(req.query);
    
    const conditions: any[] = [];
    
    if (filters.groupId) {
      const membership = await db.select()
        .from(schema.groupMembers)
        .where(and(
          eq(schema.groupMembers.groupId, filters.groupId),
          eq(schema.groupMembers.userId, req.user!.id)
        ))
        .limit(1);

      if (!membership || membership.length === 0) {
        return res.status(403).json({ error: 'Not a member of this group' });
      }

      // Show all group members' transactions
      const memberIds = await getGroupMemberIds(filters.groupId);
      conditions.push(
        or(
          eq(schema.transactions.groupId, filters.groupId),
          inArray(schema.transactions.userId, memberIds)
        )
      );
    } else {
      if (req.user!.currentGroupId) {
        conditions.push(
          or(
            eq(schema.transactions.userId, req.user!.id),
            eq(schema.transactions.groupId, req.user!.currentGroupId)
          )
        );
      } else {
        conditions.push(eq(schema.transactions.userId, req.user!.id));
      }
    }

    if (filters.userId) {
      conditions.push(eq(schema.transactions.userId, filters.userId));
    }
    
    if (filters.type) {
      conditions.push(eq(schema.transactions.type, filters.type));
    }
    
    if (filters.categoryId) {
      conditions.push(eq(schema.transactions.categoryId, filters.categoryId));
    }
    
    if (filters.startDate) {
      conditions.push(gte(schema.transactions.date, filters.startDate));
    }
    
    if (filters.endDate) {
      conditions.push(lte(schema.transactions.date, filters.endDate));
    }
    
    if (filters.month) {
      const [year, month] = filters.month.split('-');
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const lastDay = new Date(yearNum, monthNum, 0).getDate();
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-${lastDay}`;
      conditions.push(gte(schema.transactions.date, startDate));
      conditions.push(lte(schema.transactions.date, endDate));
    }
    
    if (filters.year) {
      conditions.push(gte(schema.transactions.date, `${filters.year}-01-01`));
      conditions.push(lte(schema.transactions.date, `${filters.year}-12-31`));
    }
    
    const transactions = await db.select({
      id: schema.transactions.id,
      amount: schema.transactions.amount,
      type: schema.transactions.type,
      description: schema.transactions.description,
      date: schema.transactions.date,
      isRecurring: schema.transactions.isRecurring,
      recurringParentId: schema.transactions.recurringParentId,
      createdAt: schema.transactions.createdAt,
      userId: schema.transactions.userId,
      groupId: schema.transactions.groupId,
      userName: schema.users.name,
      category: {
        id: schema.categories.id,
        name: schema.categories.name,
        type: schema.categories.type,
        icon: schema.categories.icon,
      },
    })
    .from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .leftJoin(schema.users, eq(schema.transactions.userId, schema.users.id))
    .where(and(...conditions))
    .orderBy(desc(schema.transactions.date));
    
    res.json(transactions);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const [transaction] = await db.select({
      id: schema.transactions.id,
      amount: schema.transactions.amount,
      type: schema.transactions.type,
      description: schema.transactions.description,
      date: schema.transactions.date,
      isRecurring: schema.transactions.isRecurring,
      recurringParentId: schema.transactions.recurringParentId,
      createdAt: schema.transactions.createdAt,
      categoryId: schema.transactions.categoryId,
      userId: schema.transactions.userId,
      groupId: schema.transactions.groupId,
      userName: schema.users.name,
      category: {
        id: schema.categories.id,
        name: schema.categories.name,
        type: schema.categories.type,
        icon: schema.categories.icon,
      },
    })
    .from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .leftJoin(schema.users, eq(schema.transactions.userId, schema.users.id))
    .where(eq(schema.transactions.id, id))
    .limit(1);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.userId !== req.user!.id && transaction.groupId) {
      const membership = await db.select()
        .from(schema.groupMembers)
        .where(and(
          eq(schema.groupMembers.groupId, transaction.groupId),
          eq(schema.groupMembers.userId, req.user!.id)
        ))
        .limit(1);

      if (membership.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (transaction.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = createTransactionSchema.parse(req.body);
    
    let groupId = data.groupId || null;
    
    if (groupId) {
      const membership = await db.select()
        .from(schema.groupMembers)
        .where(and(
          eq(schema.groupMembers.groupId, groupId),
          eq(schema.groupMembers.userId, req.user!.id)
        ))
        .limit(1);

      if (membership.length === 0) {
        return res.status(403).json({ error: 'Not a member of this group' });
      }
    }
    
    const [transaction] = await db.insert(schema.transactions).values({
      amount: data.amount,
      type: data.type,
      categoryId: data.categoryId,
      description: data.description,
      date: data.date,
      isRecurring: data.isRecurring ?? false,
      userId: req.user!.id,
      groupId,
    }).returning();
    
    res.status(201).json(transaction);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = updateTransactionSchema.parse(req.body);
    
    const [existing] = await db.select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, id))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const canEdit = existing.userId === req.user!.id || 
      (existing.groupId && await canEditAllInGroup(req.user!.id, existing.groupId));
    
    if (!canEdit) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const [updated] = await db.update(schema.transactions)
      .set(data)
      .where(eq(schema.transactions.id, id))
      .returning();
    
    res.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { deleteAll } = req.query;
    
    const [existing] = await db.select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, id))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const canDelete = existing.userId === req.user!.id || 
      (existing.groupId && await canEditAllInGroup(req.user!.id, existing.groupId));
    
    if (!canDelete) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    if (deleteAll === 'true' && existing.isRecurring && !existing.recurringParentId) {
      await db.delete(schema.transactions)
        .where(
          or(
            eq(schema.transactions.id, id),
            eq(schema.transactions.recurringParentId, id)
          )
        );
    } else {
      await db.delete(schema.transactions).where(eq(schema.transactions.id, id));
    }
    
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

router.post('/:id/generate-recurring', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { months } = req.body;
    
    const [existing] = await db.select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, id))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (existing.type !== 'emi' || !existing.isRecurring) {
      return res.status(400).json({ error: 'Transaction is not a recurring EMI' });
    }

    if (existing.recurringParentId) {
      return res.status(400).json({ error: 'Cannot generate recurring from a child transaction' });
    }

    const canEdit = existing.userId === req.user!.id || 
      (existing.groupId && await canEditAllInGroup(req.user!.id, existing.groupId));
    
    if (!canEdit) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const monthsToGenerate = months || 12;
    const transactionsToCreate = [];
    const baseDate = new Date(existing.date);

    for (let i = 1; i <= monthsToGenerate; i++) {
      const nextDate = new Date(baseDate);
      nextDate.setMonth(nextDate.getMonth() + i);
      
      transactionsToCreate.push({
        amount: existing.amount,
        type: existing.type,
        categoryId: existing.categoryId,
        description: existing.description,
        date: nextDate.toISOString().split('T')[0],
        isRecurring: true,
        recurringParentId: existing.id,
        userId: existing.userId,
        groupId: existing.groupId,
      });
    }

    const created = await db.insert(schema.transactions).values(transactionsToCreate).returning();
    
    res.status(201).json({ count: Array.isArray(created) ? created.length : 0, transactions: created });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to generate recurring transactions' });
  }
});

async function canEditAllInGroup(userId: string, groupId: string): Promise<boolean> {
  const membership = await db.select()
    .from(schema.groupMembers)
    .where(and(
      eq(schema.groupMembers.groupId, groupId),
      eq(schema.groupMembers.userId, userId)
    ))
    .limit(1);

  return Array.isArray(membership) && membership.length > 0 && membership[0]!.role === 'owner';
}

export default router;
