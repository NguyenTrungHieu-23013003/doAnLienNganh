'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { User, AISuggestion } from '@/shared/types';
import { BrainCircuit, RefreshCw, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from "react-i18next";

const typeConfig: Record<AISuggestion['type'], { label: string; color: string; icon: React.ReactNode }> = {
  insight: { label: 'Insight', color: 'border-blue-600/20 bg-blue-950/30 text-blue-300', icon: <BrainCircuit className="w-4 h-4" /> },
  warning: { label: 'Warning', color: 'border-red-600/20 bg-red-950/20 text-red-300', icon: <AlertTriangle className="w-4 h-4" /> },
  adjustment: { label: 'Adjustment', color: 'border-amber-600/20 bg-amber-950/20 text-amber-300', icon: <Lightbulb className="w-4 h-4" /> },
};

export default function AdminAIPage() {
    const { t } = useTranslation();
  const [students, setStudents] = useState<User[]>([]);
  const [allSuggestions, setAllSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const usersRes = await fetch('/api/users?role=user', { cache: 'no-store' });
    const users: User[] = await usersRes.json();
    setStudents(users);

    const suggestionsAll = await Promise.all(
      users.map((u) => fetch(`/api/suggestions?userId=${u.id}`, { cache: 'no-store' }).then((r) => r.json()))
    );
    setAllSuggestions(suggestionsAll.flat());
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generateForUser = async (userId: string) => {
    setIsGenerating(userId);
    const metricsRes = await fetch(`/api/metrics?userId=${userId}`, { cache: 'no-store' });
    const metrics = await metricsRes.json();
    await fetch('/api/suggestions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, metrics: metrics.slice(0, 5) }),
    });
    fetchData();
    setIsGenerating(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 to-purple-950/30 border border-blue-900/20">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
            <BrainCircuit className="w-5 h-5 text-blue-400" /> {t("System AI Overview")}</h2>
          <p className="text-zinc-400 text-sm">{t("Monitor AI-generated insights across all students. Generate new analysis on demand.")}</p>
          <div className="flex gap-6 mt-4">
            <div><p className="text-2xl font-bold text-white">{allSuggestions.length}</p><p className="text-xs text-zinc-500 font-bold uppercase">{t("Total Insights")}</p></div>
            <div><p className="text-2xl font-bold text-red-400">{allSuggestions.filter((s) => s.type === 'warning').length}</p><p className="text-xs text-zinc-500 font-bold uppercase">{t("Warnings")}</p></div>
            <div><p className="text-2xl font-bold text-amber-400">{allSuggestions.filter((s) => s.type === 'adjustment').length}</p><p className="text-xs text-zinc-500 font-bold uppercase">{t("Adjustments")}</p></div>
          </div>
        </div>

        <Card className="border-zinc-800">
          <CardHeader title="Per-Student AI Status" subtitle="Generate fresh insights for each student" />
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-900">
              {isLoading ? (
                <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : students.map((student) => {
                const mySuggestions = allSuggestions.filter((s) => s.userId === student.id);
                const latest = mySuggestions[0];
                return (
                  <div key={student.id} className="p-6 flex items-start gap-5">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold shrink-0">
                      {student.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{student.fullName}</p>
                      <p className="text-xs text-zinc-500 mb-2">{mySuggestions.length} {t("insights generated")}</p>
                      {latest && (
                        <div className={cn('text-xs p-3 rounded-xl border', typeConfig[latest.type].color)}>
                          <div className="flex items-center gap-1.5 mb-1 font-bold opacity-70">
                            {typeConfig[latest.type].icon}
                            {t("Latest:")}{typeConfig[latest.type].label}
                          </div>
                          <p className="leading-relaxed line-clamp-2">{latest.suggestion}</p>
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => generateForUser(student.id)}
                      isLoading={isGenerating === student.id} className="gap-1.5 shrink-0 text-xs">
                      <RefreshCw className="w-3.5 h-3.5" /> {t("Refresh")}</Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
