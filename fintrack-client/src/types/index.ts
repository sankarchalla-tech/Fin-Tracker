export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  currentGroupId: string | null;
  currentGroup?: Group | null;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  ownerId: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: string;
}

export interface GroupWithMembers extends Group {
  members: GroupMember[];
  userRole?: UserRole;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  userId: string | null;
  groupId: string | null;
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  amount: string;
  type: TransactionType;
  description: string | null;
  date: string;
  isRecurring: boolean;
  recurringParentId: string | null;
  categoryId: string | null;
  userId: string;
  groupId: string | null;
  userName?: string;
  category: {
    id: string | null;
    name: string;
    type: TransactionType;
    icon: string | null;
  } | null;
  createdAt: string;
}

export type TransactionType = 'income' | 'expense' | 'investment' | 'emi';
export type UserRole = 'owner' | 'member' | 'individual';

export interface DashboardSummary {
  income: number;
  expense: number;
  investment: number;
  emi: number;
  netSavings: number;
}

export interface CategoryBreakdown {
  categoryId: string | null;
  name: string;
  icon: string | null;
  amount: number;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
  investment: number;
  emi: number;
}

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
  year?: string;
  groupId?: string;
  userId?: string;
}

export interface Budget {
  id: string;
  amount: string;
  categoryId: string | null;
  month: string;
  category?: {
    id: string;
    name: string;
    type: TransactionType;
    icon: string | null;
  } | null;
}

export interface BudgetStatus {
  id: string;
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string | null;
  budgetAmount: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

export interface BudgetOverview {
  budgets: BudgetStatus[];
  overall: {
    budgetAmount: number;
    spent: number;
    remaining: number;
    percentage: number;
  };
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string | null;
  userId: string | null;
  groupId: string | null;
}

export interface SavingsGoalStatus {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  percentage: number;
  remaining: number;
  isCompleted: boolean;
}

export interface GroupMembership {
  group: Group;
  role: UserRole;
  joinedAt: string;
}
