import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import { transactionsApi, categoriesApi } from '@/lib/api';
import { transactionSchema, type TransactionInput } from '@/lib/validations';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/stores/toastStore';
import type { Transaction, Category, TransactionType } from '@/types';

const transactionTypes: TransactionType[] = ['income', 'expense', 'investment', 'emi'];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string }>({
    open: false,
    id: '',
  });
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [formData, setFormData] = useState<TransactionInput>({
    amount: '',
    type: 'expense',
    categoryId: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    isRecurring: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TransactionInput, string>>>({});

  useEffect(() => {
    fetchData();
  }, [filterType, filterMonth]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterType !== 'all') params.type = filterType;
      if (filterMonth) params.month = filterMonth;

      const [transactionsRes, categoriesRes] = await Promise.all([
        transactionsApi.getAll(params),
        categoriesApi.getAll(),
      ]);
      setTransactions(transactionsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof TransactionInput, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = transactionSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof TransactionInput, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof TransactionInput;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const data = {
        amount: formData.amount,
        type: formData.type,
        categoryId: formData.categoryId || null,
        description: formData.description || undefined,
        date: formData.date,
        isRecurring: formData.isRecurring,
      };

      if (editingTransaction) {
        await transactionsApi.update(editingTransaction.id, data);
        toast.success('Transaction updated successfully');
      } else {
        await transactionsApi.create(data);
        toast.success('Transaction added successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to save transaction';
      toast.error(message);
      console.error('Failed to save transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: transaction.amount,
      type: transaction.type,
      categoryId: transaction.categoryId || '',
      description: transaction.description || '',
      date: transaction.date,
      isRecurring: transaction.isRecurring,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm({ open: false, id: '' });
    try {
      await transactionsApi.delete(id);
      toast.success('Transaction deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      type: 'expense',
      categoryId: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      isRecurring: false,
    });
    setEditingTransaction(null);
    setErrors({});
  };

  const filteredCategories = categories.filter((c) => c.type === formData.type);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {transactionTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-[160px]"
          />
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No transactions found</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <Card key={transaction.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        transaction.type === 'income'
                          ? 'bg-income/10'
                          : transaction.type === 'expense'
                          ? 'bg-expense/10'
                          : transaction.type === 'investment'
                          ? 'bg-investment/10'
                          : 'bg-emi/10'
                      }`}
                    >
                      {transaction.type === 'income' ? (
                        <ArrowUpRight className="h-4 w-4 text-income" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-expense" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {transaction.description || transaction.category?.name || 'Transaction'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{transaction.category?.name || 'Uncategorized'}</span>
                        <span>•</span>
                        <span>{formatDate(transaction.date)}</span>
                        {transaction.isRecurring && (
                          <>
                            <span>•</span>
                            <span className="text-emi">Recurring</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-semibold text-lg ${
                        transaction.type === 'income' ? 'text-income' : 'text-expense'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(parseFloat(transaction.amount))}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(transaction)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm({ open: true, id: transaction.id })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: TransactionType) => {
                  handleChange('type', value);
                  handleChange('categoryId', '');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
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

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.categoryId || ''}
                onValueChange={(value) => handleChange('categoryId', value === '_none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={filteredCategories.length === 0 ? "No categories available" : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No categories for this type.<br />
                      Add them in the Categories page.
                    </div>
                  ) : (
                    filteredCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Enter description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                disabled={isSubmitting}
                className={errors.date ? 'border-destructive' : ''}
              />
              {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
            </div>

            {formData.type === 'emi' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) => handleChange('isRecurring', e.target.checked)}
                  className="h-4 w-4"
                  disabled={isSubmitting}
                />
                <Label htmlFor="isRecurring">Recurring EMI</Label>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsDialogOpen(false); resetForm(); }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {editingTransaction ? 'Updating...' : 'Adding...'}
                  </span>
                ) : (
                  `${editingTransaction ? 'Update' : 'Add'} Transaction`
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, id: '' })}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
