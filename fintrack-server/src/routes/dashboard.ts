import { Router, Response } from 'express';
import { db, schema } from '../db';
import { eq, and, gte, lte, or, isNotNull } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { month, year, groupId } = req.query;
    
    let startDate: string;
    let endDate: string;
    
    if (month && typeof month === 'string') {
      const [y, m] = month.split('-');
      const yearNum = parseInt(y);
      const monthNum = parseInt(m);
      const lastDay = new Date(yearNum, monthNum, 0).getDate();
      startDate = `${y}-${m}-01`;
      endDate = `${y}-${m}-${lastDay}`;
    } else if (year && typeof year === 'string') {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    } else {
      const now = new Date();
      const yearNum = now.getFullYear();
      const monthNum = now.getMonth() + 1;
      const lastDay = new Date(yearNum, monthNum + 1, 0).getDate();
      const monthStr = String(monthNum).padStart(2, '0');
      startDate = `${yearNum}-${monthStr}-01`;
      endDate = `${yearNum}-${monthStr}-${lastDay}`;
    }
    
    let whereClause;
    
    if (groupId && typeof groupId === 'string') {
      whereClause = and(
        eq(schema.transactions.groupId, groupId),
        gte(schema.transactions.date, startDate),
        lte(schema.transactions.date, endDate)
      );
    } else if (req.user!.currentGroupId) {
      whereClause = or(
        and(
          eq(schema.transactions.userId, req.user!.id),
          gte(schema.transactions.date, startDate),
          lte(schema.transactions.date, endDate)
        ),
        and(
          eq(schema.transactions.groupId, req.user!.currentGroupId),
          gte(schema.transactions.date, startDate),
          lte(schema.transactions.date, endDate)
        )
      );
    } else {
      whereClause = and(
        eq(schema.transactions.userId, req.user!.id),
        gte(schema.transactions.date, startDate),
        lte(schema.transactions.date, endDate)
      );
    }
    
    const transactions = await db.select({
      type: schema.transactions.type,
      amount: schema.transactions.amount,
    })
    .from(schema.transactions)
    .where(whereClause);
    
    const summary = {
      income: 0,
      expense: 0,
      investment: 0,
      emi: 0,
      netSavings: 0,
    };
    
    for (const t of transactions) {
      const amount = parseFloat(t.amount);
      switch (t.type) {
        case 'income':
          summary.income += amount;
          break;
        case 'expense':
          summary.expense += amount;
          break;
        case 'investment':
          summary.investment += amount;
          break;
        case 'emi':
          summary.emi += amount;
          break;
      }
    }
    
    summary.netSavings = summary.income - summary.expense - summary.investment - summary.emi;
    
    res.json(summary);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

router.get('/category', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { type, month, year, groupId } = req.query;
    
    let startDate: string;
    let endDate: string;
    
    if (month && typeof month === 'string') {
      const [y, m] = month.split('-');
      const yearNum = parseInt(y);
      const monthNum = parseInt(m);
      const lastDay = new Date(yearNum, monthNum, 0).getDate();
      startDate = `${y}-${m}-01`;
      endDate = `${y}-${m}-${lastDay}`;
    } else if (year && typeof year === 'string') {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    } else {
      const now = new Date();
      const yearNum = now.getFullYear();
      const monthNum = now.getMonth() + 1;
      const lastDay = new Date(yearNum, monthNum + 1, 0).getDate();
      const monthStr = String(monthNum).padStart(2, '0');
      startDate = `${yearNum}-${monthStr}-01`;
      endDate = `${yearNum}-${monthStr}-${lastDay}`;
    }
    
    let whereClause: any[];
    
    if (groupId && typeof groupId === 'string') {
      whereClause = [
        eq(schema.transactions.groupId, groupId),
        gte(schema.transactions.date, startDate),
        lte(schema.transactions.date, endDate),
      ];
    } else {
      whereClause = [
        eq(schema.transactions.userId, req.user!.id),
        gte(schema.transactions.date, startDate),
        lte(schema.transactions.date, endDate),
      ];
      
      if (req.user!.currentGroupId) {
        whereClause = [
          or(
            eq(schema.transactions.userId, req.user!.id),
            eq(schema.transactions.groupId, req.user!.currentGroupId)
          ),
          gte(schema.transactions.date, startDate),
          lte(schema.transactions.date, endDate),
        ];
      }
    }
    
    if (type && typeof type === 'string') {
      whereClause.push(eq(schema.transactions.type, type as any));
    }
    
    const transactions = await db.select({
      categoryId: schema.transactions.categoryId,
      categoryName: schema.categories.name,
      categoryIcon: schema.categories.icon,
      type: schema.transactions.type,
      amount: schema.transactions.amount,
    })
    .from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .where(and(...whereClause));
    
    const categoryMap = new Map<string, {
      categoryId: string | null;
      name: string;
      icon: string | null;
      amount: number;
      count: number;
    }>();
    
    for (const t of transactions) {
      const key = t.categoryId || 'uncategorized';
      const amount = parseFloat(t.amount);
      
      if (categoryMap.has(key)) {
        const cat = categoryMap.get(key)!;
        cat.amount += amount;
        cat.count += 1;
      } else {
        categoryMap.set(key, {
          categoryId: t.categoryId,
          name: t.categoryName || 'Uncategorized',
          icon: t.categoryIcon,
          amount,
          count: 1,
        });
      }
    }
    
    const result = Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch category breakdown' });
  }
});

router.get('/trends', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { year, groupId } = req.query;
    const targetYear = year && typeof year === 'string' ? parseInt(year) : new Date().getFullYear();
    
    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;
    
    let whereClause;
    
    if (groupId && typeof groupId === 'string') {
      whereClause = and(
        eq(schema.transactions.groupId, groupId),
        gte(schema.transactions.date, startDate),
        lte(schema.transactions.date, endDate)
      );
    } else {
      if (req.user!.currentGroupId) {
        whereClause = and(
          or(
            eq(schema.transactions.userId, req.user!.id),
            eq(schema.transactions.groupId, req.user!.currentGroupId)
          ),
          gte(schema.transactions.date, startDate),
          lte(schema.transactions.date, endDate)
        );
      } else {
        whereClause = and(
          eq(schema.transactions.userId, req.user!.id),
          gte(schema.transactions.date, startDate),
          lte(schema.transactions.date, endDate)
        );
      }
    }
    
    const transactions = await db.select({
      type: schema.transactions.type,
      amount: schema.transactions.amount,
      date: schema.transactions.date,
    })
    .from(schema.transactions)
    .where(whereClause);
    
    const monthlyData: Array<{
      month: string;
      income: number;
      expense: number;
      investment: number;
      emi: number;
    }> = [];
    
    for (let i = 1; i <= 12; i++) {
      monthlyData.push({
        month: `${targetYear}-${String(i).padStart(2, '0')}`,
        income: 0,
        expense: 0,
        investment: 0,
        emi: 0,
      });
    }
    
    for (const t of transactions) {
      const parts = t.date.split('-');
      const monthStr = parts[1];
      if (!monthStr) continue;
      const month = parseInt(monthStr) - 1;
      const amount = parseFloat(t.amount);
      const data = monthlyData[month];
      if (!data) continue;
      
      switch (t.type) {
        case 'income':
          data.income += amount;
          break;
        case 'expense':
          data.expense += amount;
          break;
        case 'investment':
          data.investment += amount;
          break;
        case 'emi':
          data.emi += amount;
          break;
      }
    }
    
    res.json(monthlyData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

router.get('/budgets', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { month, groupId } = req.query;
    
    if (!month || typeof month !== 'string') {
      return res.status(400).json({ error: 'Month parameter required' });
    }

    const [year, m] = month.split('-');
    const yearNum = parseInt(year);
    const monthNum = parseInt(m);
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const startDate = `${year}-${m}-01`;
    const endDate = `${year}-${m}-${lastDay}`;
    
    let budgetWhere;
    let transactionWhere;
    
    if (groupId && typeof groupId === 'string') {
      budgetWhere = and(
        eq(schema.budgets.groupId, groupId),
        eq(schema.budgets.month, month)
      );
      transactionWhere = and(
        eq(schema.transactions.groupId, groupId),
        eq(schema.transactions.type, 'expense'),
        gte(schema.transactions.date, startDate),
        lte(schema.transactions.date, endDate)
      );
    } else {
      budgetWhere = and(
        eq(schema.budgets.userId, req.user!.id),
        eq(schema.budgets.month, month)
      );
      
      if (req.user!.currentGroupId) {
        transactionWhere = and(
          or(
            eq(schema.transactions.userId, req.user!.id),
            eq(schema.transactions.groupId, req.user!.currentGroupId)
          ),
          eq(schema.transactions.type, 'expense'),
          gte(schema.transactions.date, startDate),
          lte(schema.transactions.date, endDate)
        );
      } else {
        transactionWhere = and(
          eq(schema.transactions.userId, req.user!.id),
          eq(schema.transactions.type, 'expense'),
          gte(schema.transactions.date, startDate),
          lte(schema.transactions.date, endDate)
        );
      }
    }
    
    const budgets = await db.select({
      id: schema.budgets.id,
      amount: schema.budgets.amount,
      categoryId: schema.budgets.categoryId,
      categoryName: schema.categories.name,
      categoryIcon: schema.categories.icon,
    })
    .from(schema.budgets)
    .leftJoin(schema.categories, eq(schema.budgets.categoryId, schema.categories.id))
    .where(budgetWhere);
    
    const transactions = await db.select({
      categoryId: schema.transactions.categoryId,
      amount: schema.transactions.amount,
    })
    .from(schema.transactions)
    .where(transactionWhere);
    
    const spentByCategory = new Map<string, number>();
    for (const t of transactions) {
      const key = t.categoryId || 'uncategorized';
      const amount = parseFloat(t.amount);
      spentByCategory.set(key, (spentByCategory.get(key) || 0) + amount);
    }
    
    const overallSpent = Array.from(spentByCategory.values()).reduce((a, b) => a + b, 0);
    
    const budgetStatus = budgets.map(b => {
      const spent = spentByCategory.get(b.categoryId || 'uncategorized') || 0;
      const budgetAmount = parseFloat(b.amount);
      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: b.categoryName || 'Overall',
        categoryIcon: b.categoryIcon,
        budgetAmount,
        spent,
        remaining: budgetAmount - spent,
        percentage: budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0,
        isOverBudget: spent > budgetAmount,
      };
    });
    
    const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
    
    res.json({
      budgets: budgetStatus,
      overall: {
        budgetAmount: totalBudget,
        spent: overallSpent,
        remaining: totalBudget - overallSpent,
        percentage: totalBudget > 0 ? (overallSpent / totalBudget) * 100 : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch budget status' });
  }
});

router.get('/savings-goals', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.query;
    
    let whereClause;
    
    if (groupId && typeof groupId === 'string') {
      whereClause = eq(schema.savingsGoals.groupId, groupId);
    } else {
      if (req.user!.currentGroupId) {
        whereClause = or(
          eq(schema.savingsGoals.userId, req.user!.id),
          eq(schema.savingsGoals.groupId, req.user!.currentGroupId)
        );
      } else {
        whereClause = eq(schema.savingsGoals.userId, req.user!.id);
      }
    }
    
    const goals = await db.select()
      .from(schema.savingsGoals)
      .where(whereClause);
    
    const result = goals.map(g => {
      const current = parseFloat(g.currentAmount);
      const target = parseFloat(g.targetAmount);
      return {
        id: g.id,
        name: g.name,
        targetAmount: target,
        currentAmount: current,
        deadline: g.deadline,
        percentage: target > 0 ? (current / target) * 100 : 0,
        remaining: target - current,
        isCompleted: current >= target,
      };
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch savings goals' });
  }
});

export default router;
