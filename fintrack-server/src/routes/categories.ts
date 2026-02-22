import { Router, Response } from 'express';
import { db, schema } from '../db';
import { eq, or, isNull, and } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createCategorySchema } from '../types/validations';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.query;

    let whereClause;
    
    if (groupId && typeof groupId === 'string') {
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

      whereClause = or(
        and(isNull(schema.categories.userId), isNull(schema.categories.groupId)),
        eq(schema.categories.groupId, groupId)
      );
    } else {
      whereClause = or(
        and(isNull(schema.categories.userId), isNull(schema.categories.groupId)),
        eq(schema.categories.userId, req.user!.id)
      );
    }

    const categories = await db.select()
      .from(schema.categories)
      .where(whereClause)
      .orderBy(schema.categories.name);
    
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = createCategorySchema.parse(req.body);
    
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
    
    const [category] = await db.insert(schema.categories).values({
      name: data.name,
      type: data.type,
      icon: data.icon,
      userId: groupId ? null : req.user!.id,
      groupId,
      isDefault: false,
    }).returning();
    
    res.status(201).json(category);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const [existing] = await db.select().from(schema.categories)
      .where(eq(schema.categories.id, id))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    if (existing.isDefault) {
      return res.status(403).json({ error: 'Cannot delete default categories' });
    }

    if (existing.groupId) {
      const membership = await db.select()
        .from(schema.groupMembers)
        .where(and(
          eq(schema.groupMembers.groupId, existing.groupId),
          eq(schema.groupMembers.userId, req.user!.id)
        ))
        .limit(1);

      if (membership.length === 0 || membership[0]!.role !== 'owner') {
        return res.status(403).json({ error: 'Owner permission required to delete group categories' });
      }
    } else if (existing.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    await db.delete(schema.categories).where(eq(schema.categories.id, id));
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
