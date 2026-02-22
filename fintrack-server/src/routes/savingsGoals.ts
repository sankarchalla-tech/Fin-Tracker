import { Router, Response } from 'express';
import { db, schema } from '../db';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createSavingsGoalSchema, updateSavingsGoalSchema, addToSavingsGoalSchema } from '../types/validations';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.query;

    const conditions = [
      eq(schema.savingsGoals.userId, req.user!.id),
    ];

    if (groupId && typeof groupId === 'string') {
      conditions.length = 0;
      conditions.push(eq(schema.savingsGoals.groupId, groupId));
    }

    const goals = await db.select()
      .from(schema.savingsGoals)
      .where(and(...conditions));

    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch savings goals' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const [goal] = await db.select()
      .from(schema.savingsGoals)
      .where(eq(schema.savingsGoals.id, id))
      .limit(1);

    if (!goal) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    if (goal.userId !== req.user!.id && goal.groupId) {
      const membership = await db.select()
        .from(schema.groupMembers)
        .where(and(
          eq(schema.groupMembers.groupId, goal.groupId),
          eq(schema.groupMembers.userId, req.user!.id)
        ))
        .limit(1);

      if (membership.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (goal.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch savings goal' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = createSavingsGoalSchema.parse(req.body);

    const [goal] = await db.insert(schema.savingsGoals).values({
      name: data.name,
      targetAmount: data.targetAmount,
      deadline: data.deadline,
      userId: data.groupId ? null : req.user!.id,
      groupId: data.groupId || null,
    }).returning();

    res.status(201).json(goal);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create savings goal' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = updateSavingsGoalSchema.parse(req.body);

    const [existing] = await db.select()
      .from(schema.savingsGoals)
      .where(eq(schema.savingsGoals.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Savings goal not found' });
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

    const [updated] = await db.update(schema.savingsGoals)
      .set(data)
      .where(eq(schema.savingsGoals.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update savings goal' });
  }
});

router.post('/:id/add', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = addToSavingsGoalSchema.parse(req.body);

    const [existing] = await db.select()
      .from(schema.savingsGoals)
      .where(eq(schema.savingsGoals.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    if (existing.userId !== req.user!.id && existing.groupId) {
      const membership = await db.select()
        .from(schema.groupMembers)
        .where(and(
          eq(schema.groupMembers.groupId, existing.groupId),
          eq(schema.groupMembers.userId, req.user!.id)
        ))
        .limit(1);

      if (membership.length === 0) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    } else if (existing.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const newAmount = parseFloat(existing.currentAmount) + parseFloat(data.amount);

    const [updated] = await db.update(schema.savingsGoals)
      .set({ currentAmount: newAmount.toFixed(2) })
      .where(eq(schema.savingsGoals.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to add to savings goal' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const [existing] = await db.select()
      .from(schema.savingsGoals)
      .where(eq(schema.savingsGoals.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Savings goal not found' });
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

    await db.delete(schema.savingsGoals).where(eq(schema.savingsGoals.id, id));

    res.json({ message: 'Savings goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete savings goal' });
  }
});

export default router;
