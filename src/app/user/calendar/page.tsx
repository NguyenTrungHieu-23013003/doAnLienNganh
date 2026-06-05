'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import WeeklyCalendar from '@/shared/components/WeeklyCalendar';
import { useSession } from 'next-auth/react';
import { Task } from '@/shared/types';
import { useTranslation } from 'react-i18next';

export default function UserCalendarPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const user = session?.user as any;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/tasks?userId=${user.id}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setTasks(data))
      .finally(() => setIsLoading(false));
  }, [user]);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)]">
        <div className="mb-4">
          <h1 className="text-2xl font-black">{t('My Schedule')}</h1>
          <p className="text-zinc-500 text-sm mt-1">{t('Weekly view of all your assigned workouts and nutrition plans.')}</p>
        </div>
        
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1">
            <WeeklyCalendar tasks={tasks} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
