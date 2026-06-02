'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Task, HealthMetric, AISuggestion } from '@/shared/types';
import { useSession } from 'next-auth/react';
import { Dumbbell, Scale, Activity, Calendar, BrainCircuit, Flame, TrendingDown } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useTranslation } from "react-i18next";

export default function UserDashboard() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const user = session?.user as { id: string; role: string; fullName: string; name: string | null } | undefined;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [tasksRes, metricsRes, suggestionsRes] = await Promise.all([
      fetch(`/api/tasks?userId=${user.id}`, { cache: 'no-store' }),
      fetch(`/api/metrics?userId=${user.id}`, { cache: 'no-store' }),
      fetch(`/api/suggestions?userId=${user.id}`, { cache: 'no-store' }),
    ]);
    setTasks(await tasksRes.json());
    setMetrics(await metricsRes.json());
    setSuggestions(await suggestionsRes.json());
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  const today = tasks.filter((t) => t.status !== 'done' && t.status !== 'blocked').slice(0, 3);
  const done = tasks.filter((t) => t.status === 'done').length;
  const total = tasks.length;
  const completion = total > 0 ? Math.round((done / total) * 100) : 0;
  const latest = metrics[0];
  const streak = done;
  const suggestionColors: Record<AISuggestion['type'], string> = {
    insight: 'border-blue-600/20 bg-blue-600/5 text-blue-300',
    warning: 'border-red-600/20 bg-red-600/5 text-red-300',
    adjustment: 'border-amber-600/20 bg-amber-600/5 text-amber-300',
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Schedule + Quick Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-600/10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("Overall Progress")}</p>
                <p className="text-3xl font-bold mt-0.5">{completion}%</p>
              </div>
              <div className="flex items-center gap-6 text-center">
                <div><p className="text-xl font-bold text-green-400">{done}</p><p className="text-[10px] text-zinc-500 uppercase font-bold">{t("Completed")}</p></div>
                <div><p className="text-xl font-bold text-amber-400">{tasks.filter((t) => t.status === 'review').length}</p><p className="text-[10px] text-zinc-500 uppercase font-bold">{t("In Review")}</p></div>
                <div><p className="text-xl font-bold text-red-400">{tasks.filter((t) => t.status === 'blocked').length}</p><p className="text-[10px] text-zinc-500 uppercase font-bold">{t("Blocked")}</p></div>
              </div>
            </div>
            <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${completion}%` }} />
            </div>
          </div>

          {/* Today's tasks */}
          <Card className="border-zinc-800">
            <CardHeader title={t("Active Tasks")} subtitle={t("Your ongoing workouts and plans")}>
              <Link href="/user/tasks" className="text-xs text-blue-400 hover:text-blue-300 font-semibold">{t("View all →")}</Link>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : today.length === 0 ? (
                <div className="text-center py-12 text-zinc-600 text-sm">{t("All tasks complete — great work! 🎉")}</div>
              ) : (
                <div className="divide-y divide-zinc-900">
                  {today.map((task) => (
                    <div key={task.id} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-900/30 transition-colors">
                      <div className="p-2 rounded-lg bg-blue-600/10 text-blue-400 shrink-0">
                        <Dumbbell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{task.title}</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" /> {t("Due")}{formatDate(task.dueDate)}
                        </p>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health Snapshot */}
          {latest && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: t('Weight'), value: `${latest.weight} kg`, icon: Scale, color: 'text-blue-400' },
                { label: t('Heart Rate'), value: `${latest.heartRate} bpm`, icon: Activity, color: 'text-red-400' },
                { label: t('Body Fat'), value: `${latest.bodyFatPercentage}%`, icon: TrendingDown, color: 'text-amber-400' },
              ].map((s) => (
                <Card key={s.label} className="border-zinc-800 bg-zinc-950/50">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{s.label}</p>
                    </div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-[10px] text-zinc-600 mt-1">{t("Last recorded")}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right: AI Insights + Streak */}
        <div className="space-y-6">
          {/* Streak */}
          <Card className="border-zinc-800 bg-gradient-to-br from-amber-600/5 to-orange-600/5">
            <CardContent className="pt-6 text-center">
              <Flame className="w-10 h-10 text-orange-400 mx-auto mb-2" />
              <p className="text-4xl font-bold">{streak}</p>
              <p className="text-sm text-zinc-400 font-medium mt-1">{t("Tasks Completed")}</p>
              <p className="text-xs text-zinc-600 mt-1">{t("Keep pushing to hit your goal!")}</p>
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          <Card className="border-zinc-800">
            <CardHeader title={t("AI Insights")} subtitle={t("Personalized coaching")}>
              <BrainCircuit className="w-4 h-4 text-blue-400" />
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : suggestions.length === 0 ? (
                <p className="text-sm text-zinc-600 italic">{t("Log health metrics to unlock AI insights.")}</p>
              ) : (
                suggestions.slice(0, 3).map((s) => (
                  <div key={s.id} className={`p-3 rounded-xl border text-sm leading-relaxed ${suggestionColors[s.type]}`}>
                    {s.suggestion}
                  </div>
                ))
              )}
              <Link href="/user/insights" className="block text-center text-xs text-blue-400 hover:text-blue-300 font-semibold pt-1">
                {t("View all insights →")}</Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
