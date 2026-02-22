import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createTransactionSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount'),
  type: z.enum(['income', 'expense', 'investment', 'emi']),
  categoryId: z.string().uuid().nullable(),
  description: z.string().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  isRecurring: z.boolean().optional(),
  groupId: z.string().uuid().optional(),
});

export const updateTransactionSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount').optional(),
  type: z.enum(['income', 'expense', 'investment', 'emi']).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  description: z.string().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  isRecurring: z.boolean().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  type: z.enum(['income', 'expense', 'investment', 'emi']),
  icon: z.string().max(50).optional(),
  groupId: z.string().uuid().optional(),
});

export const transactionFilterSchema = z.object({
  type: z.enum(['income', 'expense', 'investment', 'emi']).optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
  groupId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(500).optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  description: z.string().max(500).optional(),
});

export const joinGroupSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
});

export const createBudgetSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount'),
  categoryId: z.string().uuid().nullable(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format'),
  groupId: z.string().uuid().optional(),
});

export const updateBudgetSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount').optional(),
});

export const createSavingsGoalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount'),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  groupId: z.string().uuid().optional(),
});

export const updateSavingsGoalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount').optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional().nullable(),
  currentAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount').optional(),
});

export const addToSavingsGoalSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;
export type UpdateSavingsGoalInput = z.infer<typeof updateSavingsGoalSchema>;
export type AddToSavingsGoalInput = z.infer<typeof addToSavingsGoalSchema>;
