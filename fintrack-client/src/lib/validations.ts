import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const transactionSchema = z.object({
  amount: z.string().min(1, 'Amount is required').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be greater than 0'),
  type: z.enum(['income', 'expense', 'investment', 'emi']),
  categoryId: z.string().nullable(),
  description: z.string().max(500, 'Description is too long').optional(),
  date: z.string().min(1, 'Date is required'),
  isRecurring: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  type: z.enum(['income', 'expense', 'investment', 'emi']),
  icon: z.string().max(50).optional(),
});

export const budgetSchema = z.object({
  amount: z.string().min(1, 'Amount is required').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be greater than 0'),
  categoryId: z.string().nullable(),
  month: z.string().min(1, 'Month is required'),
});

export const savingsGoalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  targetAmount: z.string().min(1, 'Target amount is required').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Target amount must be greater than 0'),
  deadline: z.string().optional().nullable(),
});

export const groupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
});

export const joinGroupSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;
export type GroupInput = z.infer<typeof groupSchema>;
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;
