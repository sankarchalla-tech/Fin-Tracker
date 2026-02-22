import { pgTable, uuid, varchar, decimal, date, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense', 'investment', 'emi']);
export const roleEnum = pgEnum('user_role', ['owner', 'member', 'individual']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: roleEnum('role').default('individual').notNull(),
  currentGroupId: uuid('current_group_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  inviteCode: varchar('invite_code', { length: 20 }).notNull().unique(),
  ownerId: uuid('owner_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const groupMembers = pgTable('group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull(),
  userId: uuid('user_id').notNull(),
  role: roleEnum('role').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: transactionTypeEnum('type').notNull(),
  userId: uuid('user_id'),
  groupId: uuid('group_id'),
  icon: varchar('icon', { length: 50 }),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum('type').notNull(),
  categoryId: uuid('category_id'),
  description: varchar('description', { length: 500 }),
  date: date('date').notNull(),
  userId: uuid('user_id').notNull(),
  groupId: uuid('group_id'),
  isRecurring: boolean('is_recurring').default(false).notNull(),
  recurringParentId: uuid('recurring_parent_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  categoryId: uuid('category_id'),
  userId: uuid('user_id'),
  groupId: uuid('group_id'),
  month: varchar('month', { length: 7 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const savingsGoals = pgTable('savings_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  targetAmount: decimal('target_amount', { precision: 12, scale: 2 }).notNull(),
  currentAmount: decimal('current_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  deadline: date('deadline'),
  userId: uuid('user_id'),
  groupId: uuid('group_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  transactions: many(transactions),
  categories: many(categories),
  groups: many(groupMembers),
  currentGroup: one(groups, {
    fields: [users.currentGroupId],
    references: [groups.id],
  }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  owner: one(users, {
    fields: [groups.ownerId],
    references: [users.id],
  }),
  members: many(groupMembers),
  transactions: many(transactions),
  categories: many(categories),
  budgets: many(budgets),
  savingsGoals: many(savingsGoals),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [categories.groupId],
    references: [groups.id],
  }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [transactions.groupId],
    references: [groups.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  recurringParent: one(transactions, {
    fields: [transactions.recurringParentId],
    references: [transactions.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [budgets.groupId],
    references: [groups.id],
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const savingsGoalsRelations = relations(savingsGoals, ({ one }) => ({
  user: one(users, {
    fields: [savingsGoals.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [savingsGoals.groupId],
    references: [groups.id],
  }),
}));

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Group = InferSelectModel<typeof groups>;
export type NewGroup = InferInsertModel<typeof groups>;
export type GroupMember = InferSelectModel<typeof groupMembers>;
export type NewGroupMember = InferInsertModel<typeof groupMembers>;
export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;
export type Transaction = InferSelectModel<typeof transactions>;
export type NewTransaction = InferInsertModel<typeof transactions>;
export type Budget = InferSelectModel<typeof budgets>;
export type NewBudget = InferInsertModel<typeof budgets>;
export type SavingsGoal = InferSelectModel<typeof savingsGoals>;
export type NewSavingsGoal = InferInsertModel<typeof savingsGoals>;
export type TransactionType = typeof transactionTypeEnum.enumValues[number];
export type UserRole = typeof roleEnum.enumValues[number];
