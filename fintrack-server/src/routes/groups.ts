import { Router, Response } from 'express';
import { db, schema } from '../db';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createGroupSchema, updateGroupSchema, joinGroupSchema } from '../types/validations';
import { generateInviteCode } from '../db/seed';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const memberships = await db.select({
      group: schema.groups,
      role: schema.groupMembers.role,
      joinedAt: schema.groupMembers.joinedAt,
    })
    .from(schema.groupMembers)
    .innerJoin(schema.groups, eq(schema.groupMembers.groupId, schema.groups.id))
    .where(eq(schema.groupMembers.userId, req.user!.id));

    res.json(memberships);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

router.get('/:groupId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const groupId = req.params.groupId as string;
    
    const membership = await db.select()
      .from(schema.groupMembers)
      .where(and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, req.user!.id)
      ))
      .limit(1);

    if (membership.length === 0) {
      return res.status(404).json({ error: 'Group not found or not a member' });
    }

    const [group] = await db.select()
      .from(schema.groups)
      .where(eq(schema.groups.id, groupId))
      .limit(1);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const members = await db.select({
      id: schema.groupMembers.id,
      userId: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.groupMembers.role,
      joinedAt: schema.groupMembers.joinedAt,
    })
    .from(schema.groupMembers)
    .innerJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
    .where(eq(schema.groupMembers.groupId, groupId));

    res.json({ ...group, members, userRole: membership[0]!.role });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = createGroupSchema.parse(req.body);
    
    const inviteCode = generateInviteCode();
    
    const [group] = await db.insert(schema.groups).values({
      name: data.name,
      description: data.description,
      inviteCode,
      ownerId: req.user!.id,
    }).returning();

    await db.insert(schema.groupMembers).values({
      groupId: group.id,
      userId: req.user!.id,
      role: 'owner',
    });

    await db.update(schema.users)
      .set({ currentGroupId: group.id, role: 'owner' })
      .where(eq(schema.users.id, req.user!.id));

    res.status(201).json(group);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create group' });
  }
});

router.put('/:groupId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const groupId = req.params.groupId as string;
    const data = updateGroupSchema.parse(req.body);
    
    const membership = await db.select()
      .from(schema.groupMembers)
      .where(and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, req.user!.id)
      ))
      .limit(1);

    if (membership.length === 0 || membership[0]!.role !== 'owner') {
      return res.status(403).json({ error: 'Owner permission required' });
    }

    const [updated] = await db.update(schema.groups)
      .set(data)
      .where(eq(schema.groups.id, groupId))
      .returning();

    res.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update group' });
  }
});

router.post('/join', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = joinGroupSchema.parse(req.body);
    
    const [group] = await db.select()
      .from(schema.groups)
      .where(eq(schema.groups.inviteCode, data.inviteCode))
      .limit(1);

    if (!group) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const existingMembership = await db.select()
      .from(schema.groupMembers)
      .where(and(
        eq(schema.groupMembers.groupId, group.id),
        eq(schema.groupMembers.userId, req.user!.id)
      ))
      .limit(1);

    if (existingMembership.length > 0) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    await db.insert(schema.groupMembers).values({
      groupId: group.id,
      userId: req.user!.id,
      role: 'member',
    });

    await db.update(schema.users)
      .set({ currentGroupId: group.id, role: 'member' })
      .where(eq(schema.users.id, req.user!.id));

    res.json(group);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to join group' });
  }
});

router.post('/:groupId/leave', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const groupId = req.params.groupId as string;
    
    const membership = await db.select()
      .from(schema.groupMembers)
      .where(and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, req.user!.id)
      ))
      .limit(1);

    if (membership.length === 0) {
      return res.status(404).json({ error: 'Not a member of this group' });
    }

    if (membership[0]!.role === 'owner') {
      return res.status(400).json({ error: 'Owner cannot leave the group. Transfer ownership or delete the group.' });
    }

    await db.delete(schema.groupMembers)
      .where(and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, req.user!.id)
      ));

    if (req.user!.currentGroupId === groupId) {
      await db.update(schema.users)
        .set({ currentGroupId: null, role: 'individual' })
        .where(eq(schema.users.id, req.user!.id));
    }

    res.json({ message: 'Left group successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

router.delete('/:groupId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const groupId = req.params.groupId as string;
    
    const [group] = await db.select()
      .from(schema.groups)
      .where(eq(schema.groups.id, groupId))
      .limit(1);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Owner permission required' });
    }

    await db.delete(schema.groups).where(eq(schema.groups.id, groupId));

    await db.update(schema.users)
      .set({ currentGroupId: null, role: 'individual' })
      .where(eq(schema.users.currentGroupId, groupId));

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

router.post('/:groupId/regenerate-code', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const groupId = req.params.groupId as string;
    
    const membership = await db.select()
      .from(schema.groupMembers)
      .where(and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, req.user!.id)
      ))
      .limit(1);

    if (membership.length === 0 || membership[0]!.role !== 'owner') {
      return res.status(403).json({ error: 'Owner permission required' });
    }

    const newInviteCode = generateInviteCode();

    const [updated] = await db.update(schema.groups)
      .set({ inviteCode: newInviteCode })
      .where(eq(schema.groups.id, groupId))
      .returning();

    res.json({ inviteCode: updated.inviteCode });
  } catch (error) {
    res.status(500).json({ error: 'Failed to regenerate invite code' });
  }
});

router.post('/:groupId/transfer-ownership', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const groupId = req.params.groupId as string;
    const { newOwnerId } = req.body;
    
    if (!newOwnerId) {
      return res.status(400).json({ error: 'New owner ID required' });
    }

    const membership = await db.select()
      .from(schema.groupMembers)
      .where(and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, req.user!.id)
      ))
      .limit(1);

    if (membership.length === 0 || membership[0]!.role !== 'owner') {
      return res.status(403).json({ error: 'Owner permission required' });
    }

    const newOwnerMembership = await db.select()
      .from(schema.groupMembers)
      .where(and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, newOwnerId)
      ))
      .limit(1);

    if (newOwnerMembership.length === 0) {
      return res.status(404).json({ error: 'New owner is not a member of this group' });
    }

    await db.update(schema.groupMembers)
      .set({ role: 'member' })
      .where(and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, req.user!.id)
      ));

    await db.update(schema.groupMembers)
      .set({ role: 'owner' })
      .where(and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, newOwnerId)
      ));

    await db.update(schema.groups)
      .set({ ownerId: newOwnerId })
      .where(eq(schema.groups.id, groupId));

    await db.update(schema.users)
      .set({ role: 'member' })
      .where(eq(schema.users.id, req.user!.id));

    await db.update(schema.users)
      .set({ role: 'owner' })
      .where(eq(schema.users.id, newOwnerId));

    res.json({ message: 'Ownership transferred successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to transfer ownership' });
  }
});

export default router;
