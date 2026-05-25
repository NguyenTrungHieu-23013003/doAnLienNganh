'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Dumbbell, Activity, MessageSquare,
  LogOut, ChevronRight, BrainCircuit, ShieldCheck, ClipboardList, Scale,
  Settings,
} from 'lucide-react';
import { useSettings } from '@/features/settings/SettingsContext';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/Button';

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
  const { language, theme, setLanguage, setTheme } = useSettings();
  const { t } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  if (!user) return null;

  const menuItems = menuItemsByRole[user.role as keyof typeof menuItemsByRole] ?? [];

  return (
    <aside className="w-[260px] h-screen fixed left-0 top-0 flex flex-col z-20" style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)', transition: 'background 0.2s ease' }}>
      {/* Logo */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight" style={{ color: 'var(--fg-main)' }}>{t("FitnessTracker")}</span>
            <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--fg-muted)' }}>
              {user.role === 'admin' ? 'Administration' : user.role === 'coach' ? 'Coach Panel' : 'Student Portal'}
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px mx-4" style={{ background: 'var(--border-color)' }} />

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--fg-muted)' }}>{t('Menu')}</p>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-150 group border',
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border-blue-600/20'
                  : 'border-transparent'
              )}
              style={!isActive ? { color: 'var(--fg-muted)' } : undefined}
              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--fg-main)'; } }}
              onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)'; } }}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn('w-4 h-4', isActive ? 'text-blue-400' : '')} style={!isActive ? { color: 'var(--fg-muted)' } : undefined} />
                <span className="text-sm font-medium">{t(item.name)}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-500" />}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-xs font-bold text-white shadow">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg-main)' }}>{user.fullName}</p>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>{user.role}</p>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} title={t('Settings')}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={logout} title={t('Sign Out')}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title={t('Settings')}>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-zinc-400 mb-3">{t('Language')}</p>
            <div className="flex gap-3">
              <Button 
                variant={language === 'vi' ? 'primary' : 'outline'} 
                onClick={() => setLanguage('vi')}
                className="flex-1"
              >
                {t('Vietnamese')}
              </Button>
              <Button 
                variant={language === 'en' ? 'primary' : 'outline'} 
                onClick={() => setLanguage('en')}
                className="flex-1"
              >
                {t('English')}
              </Button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-400 mb-3">{t('Theme')}</p>
            <div className="flex gap-3">
              <Button 
                variant={theme === 'light' ? 'primary' : 'outline'} 
                onClick={() => setTheme('light')}
                className="flex-1"
              >
                {t('Light')}
              </Button>
              <Button 
                variant={theme === 'dark' ? 'primary' : 'outline'} 
                onClick={() => setTheme('dark')}
                className="flex-1"
              >
                {t('Dark')}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </aside>
  );
};
