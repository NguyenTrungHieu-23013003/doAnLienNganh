'use client';

import React from 'react';
import { Sidebar } from '@/shared/components/Sidebar';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/shared/components/NotificationBell';
import { useTranslation } from 'react-i18next';
import ChatBot from '@/shared/components/ChatBot';
import { Menu } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const user = session?.user as { id: string, role?: string, fullName?: string, name?: string | null } | undefined;
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
    <div className="flex min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-main)', color: 'var(--fg-main)', transition: 'background 0.2s ease, color 0.2s ease' }}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 md:ml-[280px] w-full p-4 md:p-8 animate-fade-in overflow-x-hidden">
        <header className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 rounded-lg text-zinc-400 hover:text-zinc-100"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" style={{ color: 'var(--fg-main)' }} />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: 'var(--fg-main)' }}>{t("Welcome, ")}{user.fullName || user.name}</h1>
              <p className="text-xs md:text-sm" style={{ color: 'var(--fg-muted)' }}>{t("Here's what's happening with your fitness journey today.")}</p>
            </div>
          </div>
          <div className="flex gap-4 items-center w-full md:w-auto justify-between md:justify-end">
            <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-medium" style={{ background: 'var(--bg-badge)', border: '1px solid var(--border-color)', color: 'var(--fg-muted)' }}>
               {t("Server Status:")} <span className="text-green-500">{t("Live")}</span>
            </div>
            <NotificationBell userId={user.id} />
          </div>
        </header>
        {children}
      </main>
      
      {/* Thêm ChatBot cho User role */}
      {user.role === 'user' && (
        <ChatBot userId={user.id} userName={user.fullName || user.name || "User"} />
      )}
    </div>
  );
}
