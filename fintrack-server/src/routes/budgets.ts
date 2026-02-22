import { Router, Response } from 'express';
import { db, schema } from '../db';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createBudgetSchema, updateBudgetSchema } from '../types/validations';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { month, groupId } = req.query;

    const conditions = [
      eq(schema.budgets.userId, req.user!.id),
    ];

    if (groupId && typeof groupId === 'string') {
      conditions.length = 0;
      conditions.push(eq(schema.budgets.groupId, groupId));
    }

    if (month && typeof month === 'string') {
      conditions.push(eq(schema.budgets.month, month));
    }

    const budgets = await db.select({
      id: schema.budgets.id,
      amount: schema.budgets.amount,
      month: schema.budgets.month,
      categoryId: schema.budgets.categoryId,
      category: {
        id: schema.categories.id,
        name: schema.categories.name,
        type: schema.categories.type,
        icon: schema.categories.icon,
      },
    })
    .from(schema.budgets)
    .leftJoin(schema.categories, eq(schema.budgets.categoryId, schema.categories.id))
    .where(and(...conditions));

    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = createBudgetSchema.parse(req.body);

    const existing = await db.select()
      .from(schema.budgets)
      .where(and(
        eq(schema.budgets.month, data.month),
        data.categoryId ? eq(schema.budgets.categoryId, data.categoryId) : eq(schema.budgets.categoryId, null!),
        data.groupId ? eq(schema.budgets.groupId, data.groupId) : eq(schema.budgets.userId, req.user!.id)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(schema.budgets)
        .set({ amount: data.amount })
        .where(eq(schema.budgets.id, existing[0]!.id))
        .returning();
      return res.json(updated);
    }

    const [budget] = await db.insert(schema.budgets).values({
      amount: data.amount,
      categoryId: data.categoryId,
      month: data.month,
      userId: data.groupId ? null : req.user!.id,
      groupId: data.groupId || null,
    }).returning();

    res.status(201).json(budget);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = updateBudgetSchema.parse(req.body);

    const [existing] = await db.select()
      .from(schema.budgets)
      .where(eq(schema.budgets.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    if (existing.userId !== req.user!.id && existing.groupId) {
      const membership = await db.select()
        .from(schema.groupMembers)
        .where(and(
          eq(schema.groupMembers.groupId, existing.groupId),
          eq(schema.groupMembers.userId, req.user!.id)
        ))
        .limit(1);

      if (membership.length === 0 || membership[0]!.role !== 'owner') {
        return res.status(403).json({ error: 'Permission denied' });
      }
    } else if (existing.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const [updated] = await db.update(schema.budgets)
      .set(data)
      .where(eq(schema.budgets.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const [existing] = await db.select()
      .from(schema.budgets)
      .where(eq(schema.budgets.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    if (existing.userId !== req.user!.id && existing.groupId) {
      const membership = await db.select()
        .from(schema.groupMembers)
        .where(and(
          eq(schema.groupMembers.groupId, existing.groupId),
          eq(schema.groupMembers.userId, req.user!.id)
        ))
        .limit(1);

      if (membership.length === 0 || membership[0]!.role !== 'owner') {
        return res.status(403).json({ error: 'Permission denied' });
      }
    } else if (existing.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await db.delete(schema.budgets).where(eq(schema.budgets.id, id));

    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

export default router;
