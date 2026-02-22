import { useEffect, useState } from 'react';
import { Plus, Trash2, PiggyBank, Target, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { savingsGoalsApi } from '@/lib/api';
import { savingsGoalSchema, type SavingsGoalInput } from '@/lib/validations';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import type { SavingsGoalStatus } from '@/types';

export default function SavingsGoalsPage() {
  const { user } = useAuthStore();
  const [goals, setGoals] = useState<SavingsGoalStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string }>({
    open: false,
    id: '',
  });
  const [formData, setFormData] = useState<SavingsGoalInput>({
    name: '',
    targetAmount: '',
    deadline: '',
  });
  const [addAmount, setAddAmount] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof SavingsGoalInput, string>>>({});
  const [addError, setAddError] = useState('');

  useEffect(() => {
    fetchGoals();
  }, [user?.currentGroupId]);

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const response = await savingsGoalsApi.getAll({ groupId: user?.currentGroupId || undefined });
      setGoals(response.data);
    } catch (error) {
      console.error('Failed to fetch savings goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof SavingsGoalInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = savingsGoalSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof SavingsGoalInput, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof SavingsGoalInput;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await savingsGoalsApi.create({
        name: formData.name,
        targetAmount: formData.targetAmount,
        deadline: formData.deadline || undefined,
        groupId: user?.currentGroupId || undefined,
      });
      toast.success('Savings goal created successfully');
      setIsCreateDialogOpen(false);
      setFormData({ name: '', targetAmount: '', deadline: '' });
      fetchGoals();
    } catch (error) {
      console.error('Failed to create savings goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!selectedGoalId) return;

    const numAmount = parseFloat(addAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setAddError('Please enter a valid amount greater than 0');
      return;
    }

    setIsSubmitting(true);

    try {
      await savingsGoalsApi.add(selectedGoalId, addAmount);
      toast.success('Funds added successfully');
      setIsAddDialogOpen(false);
      setAddAmount('');
      setSelectedGoalId(null);
      fetchGoals();
    } catch (error) {
      console.error('Failed to add to savings goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm({ open: false, id: '' });
    try {
      await savingsGoalsApi.delete(id);
      toast.success('Savings goal deleted successfully');
      fetchGoals();
    } catch (error) {
      console.error('Failed to delete savings goal:', error);
    }
  };

  const openAddDialog = (id: string) => {
    setSelectedGoalId(id);
    setIsAddDialogOpen(true);
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
        <h1 className="text-2xl font-bold">Savings Goals</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PiggyBank className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No savings goals yet</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create a Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <Card key={goal.id} className={goal.isCompleted ? 'ring-2 ring-green-500' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Target className={`h-5 w-5 ${goal.isCompleted ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <CardTitle className="text-lg">{goal.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirm({ open: true, id: goal.id })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className={goal.isCompleted ? 'text-green-500 font-medium' : ''}>
                    {goal.percentage.toFixed(1)}%
                  </span>
                </div>

                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${goal.isCompleted ? 'bg-green-500' : 'bg-primary'}`}
                    style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span>{formatCurrency(goal.currentAmount)}</span>
                  <span className="text-muted-foreground">of {formatCurrency(goal.targetAmount)}</span>
                </div>

                {goal.deadline && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Deadline: {format(parseISO(goal.deadline), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}

                {!goal.isCompleted && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => openAddDialog(goal.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Funds
                  </Button>
                )}

                {goal.isCompleted && (
                  <div className="text-center text-green-500 font-medium">
                    Goal Completed!
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) { setErrors({}); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Savings Goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Goal Name</Label>
              <Input
                id="name"
                placeholder="New Car, Vacation, Emergency Fund..."
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={isSubmitting}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Target Amount</Label>
              <Input
                id="targetAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.targetAmount}
                onChange={(e) => handleChange('targetAmount', e.target.value)}
                disabled={isSubmitting}
                className={errors.targetAmount ? 'border-destructive' : ''}
              />
              {errors.targetAmount && <p className="text-sm text-destructive">{errors.targetAmount}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline (optional)</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline || ''}
                onChange={(e) => handleChange('deadline', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Creating...
                  </span>
                ) : (
                  'Create Goal'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) { setAddAmount(''); setAddError(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Funds</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="addAmount">Amount</Label>
              <Input
                id="addAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={addAmount}
                onChange={(e) => { setAddAmount(e.target.value); setAddError(''); }}
                disabled={isSubmitting}
                className={addError ? 'border-destructive' : ''}
              />
              {addError && <p className="text-sm text-destructive">{addError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Adding...
                  </span>
                ) : (
                  'Add Funds'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, id: '' })}
        title="Delete Savings Goal"
        description="Are you sure you want to delete this savings goal? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
