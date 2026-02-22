import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { initializeTheme } from '@/stores/themeStore';
import Layout from '@/components/layout/Layout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import TransactionsPage from '@/pages/TransactionsPage';
import CategoriesPage from '@/pages/CategoriesPage';
import GroupsPage from '@/pages/GroupsPage';
import BudgetsPage from '@/pages/BudgetsPage';
import SavingsGoalsPage from '@/pages/SavingsGoalsPage';
import SettingsPage from '@/pages/SettingsPage';
import Toaster from '@/components/ui/toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const { isAuthenticated, isLoading, fetchUser } = useAuthStore();

  useEffect(() => {
    initializeTheme();
    fetchUser();
  }, [fetchUser]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" />} />
      <Route
        path="/"
        element={
          <Layout>
            <DashboardPage />
          </Layout>
        }
      />
      <Route
        path="/transactions"
        element={
          <Layout>
            <TransactionsPage />
          </Layout>
        }
      />
      <Route
        path="/categories"
        element={
          <Layout>
            <CategoriesPage />
          </Layout>
        }
      />
      <Route
        path="/groups"
        element={
          <Layout>
            <GroupsPage />
          </Layout>
        }
      />
      <Route
        path="/budgets"
        element={
          <Layout>
            <BudgetsPage />
          </Layout>
        }
      />
      <Route
        path="/savings-goals"
        element={
          <Layout>
            <SavingsGoalsPage />
          </Layout>
        }
      />
      <Route
        path="/settings"
        element={
          <Layout>
            <SettingsPage />
          </Layout>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
