'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { Task, User } from '@/shared/types';
import { useSession } from 'next-auth/react';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Users, ClipboardList, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from "react-i18next";
import Leaderboard from '@/shared/components/Leaderboard';

export default function CoachDashboard() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const user = session?.user as { id: string; role: string; fullName: string; name: string | null } | undefined;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [tasksRes, studentsRes] = await Promise.all([
      fetch(`/api/tasks?coachId=${user.id}`, { cache: 'no-store' }),
      fetch(`/api/users?coachId=${user.id}`, { cache: 'no-store' }),
    ]);
    setTasks(await tasksRes.json());
    setStudents(await studentsRes.json());
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  const reviewTasks = tasks.filter((t) => t.status === 'review');
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');

  const stats = [
    { label: t('Students'), value: students.length, icon: Users, color: 'text-blue-400' },
    { label: t('Pending Review'), value: reviewTasks.length, icon: ClipboardList, color: 'text-amber-400' },
    { label: t('Injuries'), value: blockedTasks.length, icon: AlertCircle, color: 'text-red-400' },
    { label: t('Completed'), value: tasks.filter((t) => t.status === 'done').length, icon: CheckCircle2, color: 'text-green-400' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((s) => (
            <Card key={s.label} className="border-zinc-800 bg-zinc-950/50">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{s.label}</p>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className={`text-3xl font-bold ${s.color}`}>{isLoading ? '—' : s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tasks needing action */}
          <Card className="border-zinc-800">
            <CardHeader title={t("Action Required")} subtitle={t("Tasks awaiting your review or intervention")}>
              <Link href="/coach/tasks" className="text-xs text-blue-400 hover:text-blue-300 font-semibold">{t("View all →")}</Link>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : [...reviewTasks, ...blockedTasks].length === 0 ? (
                <div className="text-center py-10 text-zinc-600 text-sm">{t("All clear! No actions needed.")}</div>
              ) : (
                <div className="divide-y divide-zinc-900">
                  {[...blockedTasks, ...reviewTasks].slice(0, 5).map((task) => {
                    const student = students.find((s) => s.id === task.userId);
                    return (
                      <div key={task.id} className="flex items-center gap-4 px-6 py-4">
                        <div className={`w-1.5 h-10 rounded-full shrink-0 ${task.status === 'blocked' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{task.title}</p>
                          <p className="text-xs text-zinc-500">{student?.fullName}</p>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student compliance */}
          <Card className="border-zinc-800">
            <CardHeader title={t("Student Progress")} subtitle={t("Completion rate at a glance")}>
              <Link href="/coach/students" className="text-xs text-blue-400 hover:text-blue-300 font-semibold">{t("View all →")}</Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : students.length === 0 ? (
                <p className="text-center py-8 text-zinc-600 text-sm">{t("No students assigned.")}</p>
              ) : (
                students.map((s) => {
                  const myTasks = tasks.filter((t) => t.userId === s.id);
                  const done = myTasks.filter((t) => t.status === 'done').length;
                  const pct = myTasks.length > 0 ? Math.round((done / myTasks.length) * 100) : 0;
                  const hasBlocked = myTasks.some((t) => t.status === 'blocked');
                  return (
                    <div key={s.id} className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold">
                          {s.fullName.charAt(0)}
                        </div>
                        {hasBlocked && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold">{s.fullName}</p>
                          <p className="text-xs text-zinc-500 font-bold">{done}/{myTasks.length} {t("tasks")}</p>
                        </div>
                        <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-bold w-10 text-right">{pct}%</span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
        <Leaderboard isCoachView={true} />
      </div>
    </DashboardLayout>
  );
}
