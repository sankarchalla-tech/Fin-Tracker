import { db, schema } from './index';
import { isNull, and } from 'drizzle-orm';

const defaultCategories = [
  { name: 'Salary', type: 'income' as const, icon: 'briefcase' },
  { name: 'Freelance', type: 'income' as const, icon: 'laptop' },
  { name: 'Investment Returns', type: 'income' as const, icon: 'trending-up' },
  { name: 'Other Income', type: 'income' as const, icon: 'plus-circle' },
  { name: 'Food & Dining', type: 'expense' as const, icon: 'utensils' },
  { name: 'Transportation', type: 'expense' as const, icon: 'car' },
  { name: 'Shopping', type: 'expense' as const, icon: 'shopping-bag' },
  { name: 'Bills & Utilities', type: 'expense' as const, icon: 'file-text' },
  { name: 'Entertainment', type: 'expense' as const, icon: 'film' },
  { name: 'Healthcare', type: 'expense' as const, icon: 'heart' },
  { name: 'Education', type: 'expense' as const, icon: 'book' },
  { name: 'Travel', type: 'expense' as const, icon: 'plane' },
  { name: 'Other Expense', type: 'expense' as const, icon: 'minus-circle' },
  { name: 'Stocks', type: 'investment' as const, icon: 'bar-chart-2' },
  { name: 'Mutual Funds', type: 'investment' as const, icon: 'pie-chart' },
  { name: 'Fixed Deposits', type: 'investment' as const, icon: 'lock' },
  { name: 'Real Estate', type: 'investment' as const, icon: 'home' },
  { name: 'Home Loan', type: 'emi' as const, icon: 'home' },
  { name: 'Car Loan', type: 'emi' as const, icon: 'car' },
  { name: 'Personal Loan', type: 'emi' as const, icon: 'user' },
  { name: 'Credit Card', type: 'emi' as const, icon: 'credit-card' },
];

export async function seedDefaultCategories() {
  console.log('Seeding default categories...');
  
  const existingDefaults = await db.select().from(schema.categories)
    .where(and(isNull(schema.categories.userId), isNull(schema.categories.groupId)));
  
  if (existingDefaults.length > 0) {
    console.log('Default categories already exist');
    return;
  }
  
  await db.insert(schema.categories).values(
    defaultCategories.map(cat => ({
      ...cat,
      userId: null,
      groupId: null,
      isDefault: true,
    }))
  );
  
  console.log('Default categories seeded successfully');
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
