import axios from 'axios';
import { toast } from '@/stores/toastStore';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.error || error.message || 'An unexpected error occurred';

    if (status === 401) {
      if (!window.location.pathname.includes('/login')) {
        toast.error('Session expired. Please login again.');
        window.location.href = '/login';
      }
    } else if (status === 403) {
      toast.error('You do not have permission to perform this action');
    } else if (status === 404) {
      toast.error('Resource not found');
    } else if (status === 400) {
      toast.error(message);
    } else if (status >= 500) {
      toast.error('Server error. Please try again later.');
    }

    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  switchGroup: (groupId: string | null) =>
    api.post('/auth/switch-group', { groupId }),
};

export const transactionsApi = {
  getAll: (filters?: Record<string, string | undefined>) =>
    api.get('/transactions', { params: filters }),
  getById: (id: string) => api.get(`/transactions/${id}`),
  create: (data: {
    amount: string;
    type: string;
    categoryId?: string | null;
    description?: string;
    date: string;
    isRecurring?: boolean;
    groupId?: string;
  }) => api.post('/transactions', data),
  update: (id: string, data: Partial<{
    amount: string;
    type: string;
    categoryId: string | null;
    description: string;
    date: string;
    isRecurring: boolean;
  }>) => api.put(`/transactions/${id}`, data),
  delete: (id: string, deleteAll?: boolean) =>
    api.delete(`/transactions/${id}`, { params: { deleteAll } }),
  generateRecurring: (id: string, months?: number) =>
    api.post(`/transactions/${id}/generate-recurring`, { months }),
};

export const categoriesApi = {
  getAll: (groupId?: string) =>
    api.get('/categories', { params: { groupId } }),
  create: (data: { name: string; type: string; icon?: string; groupId?: string }) =>
    api.post('/categories', data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export const dashboardApi = {
  getSummary: (params?: { month?: string; year?: string; groupId?: string }) =>
    api.get('/dashboard/summary', { params }),
  getCategoryBreakdown: (params?: { type?: string; month?: string; year?: string; groupId?: string }) =>
    api.get('/dashboard/category', { params }),
  getTrends: (params?: { year?: string; groupId?: string }) =>
    api.get('/dashboard/trends', { params }),
  getBudgets: (params: { month: string; groupId?: string }) =>
    api.get('/dashboard/budgets', { params }),
  getSavingsGoals: (params?: { groupId?: string }) =>
    api.get('/dashboard/savings-goals', { params }),
};

export const groupsApi = {
  getAll: () => api.get('/groups'),
  getById: (id: string) => api.get(`/groups/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post('/groups', data),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.put(`/groups/${id}`, data),
  delete: (id: string) => api.delete(`/groups/${id}`),
  join: (inviteCode: string) => api.post('/groups/join', { inviteCode }),
  leave: (id: string) => api.post(`/groups/${id}/leave`),
  regenerateCode: (id: string) => api.post(`/groups/${id}/regenerate-code`),
  transferOwnership: (id: string, newOwnerId: string) =>
    api.post(`/groups/${id}/transfer-ownership`, { newOwnerId }),
};

export const budgetsApi = {
  getAll: (params?: { month?: string; groupId?: string }) =>
    api.get('/budgets', { params }),
  create: (data: { amount: string; categoryId?: string | null; month: string; groupId?: string }) =>
    api.post('/budgets', data),
  update: (id: string, data: { amount?: string }) =>
    api.put(`/budgets/${id}`, data),
  delete: (id: string) => api.delete(`/budgets/${id}`),
};

export const savingsGoalsApi = {
  getAll: (params?: { groupId?: string }) =>
    api.get('/savings-goals', { params }),
  getById: (id: string) => api.get(`/savings-goals/${id}`),
  create: (data: { name: string; targetAmount: string; deadline?: string; groupId?: string }) =>
    api.post('/savings-goals', data),
  update: (id: string, data: { name?: string; targetAmount?: string; deadline?: string | null }) =>
    api.put(`/savings-goals/${id}`, data),
  add: (id: string, amount: string) =>
    api.post(`/savings-goals/${id}/add`, { amount }),
  delete: (id: string) => api.delete(`/savings-goals/${id}`),
};
