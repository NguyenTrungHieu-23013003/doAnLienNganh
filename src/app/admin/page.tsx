'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { User, Task, HealthMetric } from '@/shared/types';
import { Users, Dumbbell, ShieldCheck, TrendingUp, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from "react-i18next";

export default function AdminDashboard() {
    const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [usersRes, tasksRes] = await Promise.all([
      fetch('/api/users', { cache: 'no-store' }),
      fetch('/api/tasks', { cache: 'no-store' }),
    ]);
    setUsers(await usersRes.json());
    setTasks(await tasksRes.json());
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const numStudents = users.filter((u) => u.role === 'user').length;
  const numCoaches = users.filter((u) => u.role === 'coach').length;
  const numDone = tasks.filter((t) => t.status === 'done').length;
  const numBlocked = tasks.filter((t) => t.status === 'blocked').length;
  const completionRate = tasks.length > 0 ? Math.round((numDone / tasks.length) * 100) : 0;

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-400', href: '/admin/users' },
    { label: 'Active Coaches', value: numCoaches, icon: ShieldCheck, color: 'text-purple-400', href: '/admin/users' },
    { label: 'Students', value: numStudents, icon: Dumbbell, color: 'text-green-400', href: '/admin/users' },
    { label: 'Task Completion', value: `${completionRate}%`, icon: TrendingUp, color: 'text-amber-400', href: '#' },
  ];

  const taskStatus = [
    { label: 'To Do', value: tasks.filter((t) => t.status === 'todo').length, color: 'bg-zinc-600' },
    { label: 'In Progress', value: tasks.filter((t) => t.status === 'in_progress').length, color: 'bg-blue-600' },
    { label: 'Review', value: tasks.filter((t) => t.status === 'review').length, color: 'bg-amber-500' },
    { label: 'Done', value: tasks.filter((t) => t.status === 'done').length, color: 'bg-green-600' },
    { label: 'Blocked', value: numBlocked, color: 'bg-red-600' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((s) => (
            <Link key={s.label} href={s.href}>
              <Card className="border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 transition-colors cursor-pointer">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{s.label}</p>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <p className={`text-3xl font-bold ${s.color}`}>{isLoading ? '—' : s.value}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Task Distribution */}
          <Card className="border-zinc-800">
            <CardHeader title="System Task Overview" subtitle="Distribution across all statuses" />
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <>
                  <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                    {taskStatus.map((s) => (
                      s.value > 0 && tasks.length > 0 ? (
                        <div key={s.label} className={`${s.color} transition-all`} style={{ width: `${(s.value / tasks.length) * 100}%` }} />
                      ) : null
                    ))}
                  </div>
                  <div className="space-y-3">
                    {taskStatus.map((s) => (
                      <div key={s.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                          <span className="text-sm text-zinc-400">{s.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                            <div className={`h-full ${s.color} rounded-full`} style={{ width: `${tasks.length > 0 ? (s.value / tasks.length) * 100 : 0}%` }} />
                          </div>
                          <span className="text-sm font-bold text-white w-5 text-right">{s.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Coach Performance */}
          <Card className="border-zinc-800">
            <CardHeader title="Coach Performance" subtitle="Task approval and student activity">
              <Link href="/admin/users" className="text-xs text-blue-400 hover:text-blue-300 font-semibold">{t("Manage →")}</Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : users.filter((u) => u.role === 'coach').length === 0 ? (
                <p className="text-center py-8 text-zinc-600 text-sm">{t("No coaches registered yet.")}</p>
              ) : (
                users.filter((u) => u.role === 'coach').map((coach) => {
                  const coachTasks = tasks.filter((t) => t.coachId === coach.id);
                  const coachStudents = users.filter((u) => u.coachId === coach.id);
                  const done = coachTasks.filter((t) => t.status === 'done').length;
                  const pct = coachTasks.length > 0 ? Math.round((done / coachTasks.length) * 100) : 0;
                  return (
                    <div key={coach.id} className="flex items-center gap-4 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-800 flex items-center justify-center text-sm font-bold text-white">
                        {coach.fullName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm">{coach.fullName}</p>
                          <span className="text-xs text-zinc-500">{coachStudents.length} {t("students ·")}{coachTasks.length} {t("tasks")}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-purple-400 w-10 text-right">{pct}%</span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent users */}
        <Card className="border-zinc-800">
          <CardHeader title="Recent Accounts" subtitle="Latest registrations on the platform">
            <Link href="/admin/users" className="text-xs text-blue-400 hover:text-blue-300 font-semibold">{t("View all →")}</Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-900">
              {(isLoading ? [] : users.slice(0, 5)).map((u) => (
                <div key={u.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold">
                    {u.fullName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{u.fullName}</p>
                    <p className="text-xs text-zinc-500">{u.email}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                    u.role === 'admin' ? 'bg-purple-600/10 text-purple-400 border-purple-600/20' :
                    u.role === 'coach' ? 'bg-blue-600/10 text-blue-400 border-blue-600/20' :
                    'bg-green-600/10 text-green-400 border-green-600/20'
                  }`}>{u.role}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
