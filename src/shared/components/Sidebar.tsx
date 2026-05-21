'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Dumbbell, Activity, MessageSquare,
  LogOut, ChevronRight, BrainCircuit, ShieldCheck, ClipboardList, Scale,
} from 'lucide-react';

const menuItemsByRole = {
  admin: [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
    { name: 'User Management', icon: Users, href: '/admin/users' },
    { name: 'AI Overview', icon: BrainCircuit, href: '/admin/ai' },
  ],
  coach: [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/coach' },
    { name: 'My Students', icon: Users, href: '/coach/students' },
    { name: 'Task Review', icon: ClipboardList, href: '/coach/tasks' },
  ],
  user: [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/user' },
    { name: 'My Workouts', icon: Dumbbell, href: '/user/tasks' },
    { name: 'Health Metrics', icon: Scale, href: '/user/metrics' },
    { name: 'AI Insights', icon: BrainCircuit, href: '/user/insights' },
  ],
};

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const menuItems = menuItemsByRole[user.role as keyof typeof menuItemsByRole] ?? [];

  return (
    <aside className="w-[260px] h-screen fixed left-0 top-0 bg-zinc-950 border-r border-zinc-900 flex flex-col z-20">
      {/* Logo */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight">FitnessTracker</span>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">
              {user.role === 'admin' ? 'Administration' : user.role === 'coach' ? 'Coach Panel' : 'Student Portal'}
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-zinc-900 mx-4" />

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Menu</p>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-150 group',
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
              )}>
              <div className="flex items-center gap-3">
                <item.icon className={cn('w-4 h-4', isActive ? 'text-blue-400' : 'text-zinc-600 group-hover:text-zinc-400')} />
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-500" />}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-zinc-900">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-xs font-bold text-white shadow">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.fullName}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{user.role}</p>
          </div>
          <button onClick={logout} title="Sign Out"
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
