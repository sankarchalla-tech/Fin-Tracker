import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db, schema } from '../db';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, AuthRequest, generateToken } from '../middleware/auth';
import { registerSchema, loginSchema } from '../types/validations';

const router = Router();

router.post('/register', async (req, res: Response) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);
    
    const existingUser = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [user] = await db.insert(schema.users).values({
      name,
      email,
      password: hashedPassword,
      role: 'individual',
    }).returning();
    
    const token = generateToken(user.id);
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    
    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        currentGroupId: user.currentGroupId,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const users = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    const user = users[0];
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken(user.id);
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        currentGroupId: user.currentGroupId,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.post('/logout', (_req, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  let currentGroup = null;
  
  if (req.user!.currentGroupId) {
    const [group] = await db.select()
      .from(schema.groups)
      .where(eq(schema.groups.id, req.user!.currentGroupId))
      .limit(1);
    currentGroup = group || null;
  }
  
  res.json({
    user: {
      id: req.user!.id,
      name: req.user!.name,
      email: req.user!.email,
      role: req.user!.role,
      currentGroupId: req.user!.currentGroupId,
      currentGroup,
    },
  });
});

router.post('/switch-group', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.body;
    
    if (groupId) {
      const membership = await db.select()
        .from(schema.groupMembers)
        .where(and(
          eq(schema.groupMembers.groupId, groupId),
          eq(schema.groupMembers.userId, req.user!.id)
        ))
        .limit(1);

      if (!membership || membership.length === 0) {
        return res.status(403).json({ error: 'Not a member of this group' });
      }

      await db.update(schema.users)
        .set({ currentGroupId: groupId })
        .where(eq(schema.users.id, req.user!.id));
    } else {
      await db.update(schema.users)
        .set({ currentGroupId: null })
        .where(eq(schema.users.id, req.user!.id));
    }
    
    const [updatedUser] = await db.select()
      .from(schema.users)
      .where(eq(schema.users.id, req.user!.id))
      .limit(1);
    
    res.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        currentGroupId: updatedUser.currentGroupId,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to switch group' });
  }
});

export default router;
