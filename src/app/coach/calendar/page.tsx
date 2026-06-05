'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import WeeklyCalendar from '@/shared/components/WeeklyCalendar';
import { useSession } from 'next-auth/react';
import { Task, User } from '@/shared/types';
import { useTranslation } from 'react-i18next';
import { Select } from '@/shared/components/FormFields';

export default function CoachCalendarPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const user = session?.user as any;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filterStudentId, setFilterStudentId] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    
    Promise.all([
      fetch(`/api/tasks?coachId=${user.id}`, { cache: 'no-store' }),
      fetch(`/api/users?coachId=${user.id}`, { cache: 'no-store' })
    ])
      .then(async ([resTasks, resStudents]) => {
        const rawTasks = await resTasks.json();
        const activeStudents = await resStudents.json();
        
        const validTasks = rawTasks.filter((t: Task) => activeStudents.some((s: User) => s.id === t.userId));
        setTasks(validTasks);
        setStudents(activeStudents);
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const displayedTasks = filterStudentId ? tasks.filter(t => t.userId === filterStudentId) : tasks;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-6rem)]">
        <div className="mb-4 flex sm:items-center justify-between flex-col sm:flex-row gap-4">
          <div>
            <h1 className="text-2xl font-black">{t('Master Schedule')}</h1>
            <p className="text-zinc-500 text-sm mt-1">{t('View all schedules for your students.')}</p>
          </div>
          
          <div className="w-full sm:w-64">
            <Select 
              id="filterStudent" 
              label=""
              value={filterStudentId}
              options={[
                { value: '', label: t('All Students') },
                ...students.map(s => ({ value: s.id, label: s.fullName }))
              ]}
              onChange={(e) => setFilterStudentId(e.target.value)}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1">
            <WeeklyCalendar tasks={displayedTasks} students={students} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
