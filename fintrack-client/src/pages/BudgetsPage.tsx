import { useEffect, useState } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { budgetsApi, categoriesApi, dashboardApi } from '@/lib/api';
import { budgetSchema, type BudgetInput } from '@/lib/validations';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import type { BudgetOverview, Category } from '@/types';

export default function BudgetsPage() {
  const { user } = useAuthStore();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [budgetOverview, setBudgetOverview] = useState<BudgetOverview | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string }>({
    open: false,
    id: '',
  });
  const [formData, setFormData] = useState<BudgetInput>({
    amount: '',
    categoryId: '',
    month: format(new Date(), 'yyyy-MM'),
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BudgetInput, string>>>({});

  useEffect(() => {
    fetchData();
  }, [month, user?.currentGroupId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [budgetsRes, categoriesRes] = await Promise.all([
        dashboardApi.getBudgets({ month, groupId: user?.currentGroupId || undefined }),
        categoriesApi.getAll(user?.currentGroupId || undefined),
      ]);
      setBudgetOverview(budgetsRes.data);
      setCategories(categoriesRes.data.filter((c: Category) => c.type === 'expense'));
    } catch (error) {
      console.error('Failed to fetch budgets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof BudgetInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const dataToValidate = { ...formData, month };
    const result = budgetSchema.safeParse(dataToValidate);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof BudgetInput, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof BudgetInput;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await budgetsApi.create({
        amount: formData.amount,
        categoryId: formData.categoryId || null,
        month,
        groupId: user?.currentGroupId || undefined,
      });
      toast.success('Budget set successfully');
      setIsDialogOpen(false);
      setFormData({ amount: '', categoryId: '', month: format(new Date(), 'yyyy-MM') });
      fetchData();
    } catch (error) {
      console.error('Failed to create budget:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm({ open: false, id: '' });
    try {
      await budgetsApi.delete(id);
      toast.success('Budget deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to delete budget:', error);
    }
  };

  const getProgressColor = (percentage: number, isOverBudget: boolean) => {
    if (isOverBudget) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Budgets</h1>
        <div className="flex gap-2">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-[160px]"
          />
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Budget
          </Button>
        </div>
      </div>

      {budgetOverview && budgetOverview.overall.budgetAmount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overall Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Budget: {formatCurrency(budgetOverview.overall.budgetAmount)}</span>
                <span>Spent: {formatCurrency(budgetOverview.overall.spent)}</span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getProgressColor(
                    budgetOverview.overall.percentage,
                    budgetOverview.overall.spent > budgetOverview.overall.budgetAmount
                  )}`}
                  style={{ width: `${Math.min(budgetOverview.overall.percentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{budgetOverview.overall.percentage.toFixed(1)}% used</span>
                <span>
                  {budgetOverview.overall.remaining >= 0
                    ? `${formatCurrency(budgetOverview.overall.remaining)} remaining`
                    : `${formatCurrency(Math.abs(budgetOverview.overall.remaining))} over budget`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {budgetOverview?.budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No budgets set for this month</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Set a Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgetOverview?.budgets.map((budget) => (
            <Card key={budget.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{budget.categoryName}</h3>
                    <p className="text-sm text-muted-foreground">
                      Budget: {formatCurrency(budget.budgetAmount)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirm({ open: true, id: budget.id })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Spent: {formatCurrency(budget.spent)}</span>
                    <span className={budget.isOverBudget ? 'text-destructive' : ''}>
                      {budget.isOverBudget ? (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Over by {formatCurrency(Math.abs(budget.remaining))}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {formatCurrency(budget.remaining)} left
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${getProgressColor(
                        budget.percentage,
                        budget.isOverBudget
                      )}`}
                      style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {budget.percentage.toFixed(1)}% used
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setErrors({}); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Budget</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.categoryId || undefined}
                onValueChange={(value) => handleChange('categoryId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category (or leave empty for overall)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Overall Budget</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                disabled={isSubmitting}
                className={errors.amount ? 'border-destructive' : ''}
              />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Setting...
                  </span>
                ) : (
                  'Set Budget'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, id: '' })}
        title="Delete Budget"
        description="Are you sure you want to delete this budget? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
