'use client';

import React from 'react';
import { Sidebar } from '@/shared/components/Sidebar';
import { useAuth } from '@/features/auth/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="flex bg-[#0a0a0a] min-h-screen text-white">
      <Sidebar />
      <main className="flex-1 ml-[280px] p-8 animate-fade-in">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome, {user.fullName}</h1>
            <p className="text-zinc-500 text-sm">Here's what's happening with your fitness journey today.</p>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400">
               Server Status: <span className="text-green-500">Live</span>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
