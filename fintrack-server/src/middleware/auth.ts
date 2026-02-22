import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db, schema } from '../db';
import { eq, and } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  user?: schema.User;
  groupMember?: schema.GroupMember;
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  const user = await db.select().from(schema.users).where(eq(schema.users.id, decoded.userId)).limit(1);
  
  if (user.length === 0) {
    return res.status(401).json({ error: 'User not found' });
  }
  
  req.user = user[0]!;
  next();
}

export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies.token;
  
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      const user = await db.select().from(schema.users).where(eq(schema.users.id, decoded.userId)).limit(1);
      if (user.length > 0) {
        req.user = user[0];
      }
    }
  }
  
  next();
}

export async function groupMemberMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const groupId = req.params.groupId || req.body.groupId;
  
  if (!groupId) {
    return res.status(400).json({ error: 'Group ID required' });
  }
  
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const membership = await db.select()
    .from(schema.groupMembers)
    .where(and(
      eq(schema.groupMembers.groupId, groupId),
      eq(schema.groupMembers.userId, req.user.id)
    ))
    .limit(1);
  
  if (membership.length === 0) {
    return res.status(403).json({ error: 'Not a member of this group' });
  }
  
  req.groupMember = membership[0];
  next();
}

export async function groupOwnerMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const groupId = req.params.groupId || req.body.groupId;
  
  if (!groupId) {
    return res.status(400).json({ error: 'Group ID required' });
  }
  
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const membership = await db.select()
    .from(schema.groupMembers)
    .where(and(
      eq(schema.groupMembers.groupId, groupId),
      eq(schema.groupMembers.userId, req.user.id)
    ))
    .limit(1);
  
  if (membership.length === 0) {
    return res.status(403).json({ error: 'Not a member of this group' });
  }
  
  if (membership[0]!.role !== 'owner') {
    return res.status(403).json({ error: 'Owner permission required' });
  }
  
  req.groupMember = membership[0];
  next();
}

export function requireRole(role: 'owner' | 'member') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.groupMember) {
      return res.status(403).json({ error: 'Group membership required' });
    }
    
    if (role === 'owner' && req.groupMember.role !== 'owner') {
      return res.status(403).json({ error: 'Owner permission required' });
    }
    
    next();
  };
}
