'use client';

import React from 'react';
import { Sidebar } from '@/shared/components/Sidebar';
import { useAuth } from '@/features/auth/AuthContext';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/shared/components/NotificationBell';
import { useTranslation } from 'react-i18next';
import ChatBot from '@/shared/components/ChatBot';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      localStorage.setItem('userTimezone', tz);
    }
  }, []);

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-main)', color: 'var(--fg-main)', transition: 'background 0.2s ease, color 0.2s ease' }}>
      <Sidebar />
      <main className="flex-1 ml-[280px] p-8 animate-fade-in">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fg-main)' }}>{t("Welcome,")}{user.fullName}</h1>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{t("Here's what's happening with your fitness journey today.")}</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="px-4 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-badge)', border: '1px solid var(--border-color)', color: 'var(--fg-muted)' }}>
               {t("Server Status:")}<span className="text-green-500">{t("Live")}</span>
            </div>
            <NotificationBell userId={user.id} />
          </div>
        </header>
        {children}
      </main>
      
      {/* Thêm ChatBot cho User role */}
      {user.role === 'user' && (
        <ChatBot userId={user.id} userName={user.fullName} />
      )}
    </div>
  );
}
