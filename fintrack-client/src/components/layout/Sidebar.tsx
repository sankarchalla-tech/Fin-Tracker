import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowUpDown,
  Tags,
  Users,
  Wallet,
  PiggyBank,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowUpDown, label: 'Transactions' },
  { to: '/categories', icon: Tags, label: 'Categories' },
  { to: '/budgets', icon: Wallet, label: 'Budgets' },
  { to: '/savings-goals', icon: PiggyBank, label: 'Goals' },
  { to: '/groups', icon: Users, label: 'Groups' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-14 bottom-0 w-64 border-r border-border bg-card hidden md:block overflow-y-auto">
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
