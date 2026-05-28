'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { AISuggestion, HealthMetric } from '@/shared/types';
import { useSession, signOut } from 'next-auth/react';
import { BrainCircuit, Lightbulb, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from "react-i18next";

const typeConfig: Record<AISuggestion['type'], { label: string; color: string; Icon: React.FC<{ className?: string }> }> = {
  insight: { label: 'Insight', color: 'border-blue-600/20 bg-blue-600/5 text-blue-300', Icon: BrainCircuit },
  warning: { label: 'Warning', color: 'border-red-600/20 bg-red-900/10 text-red-300', Icon: AlertTriangle },
  adjustment: { label: 'Adjustment', color: 'border-amber-600/20 bg-amber-900/10 text-amber-300', Icon: Lightbulb },
};

export default function UserInsightsPage() {
    const { t } = useTranslation();
  const { data: session } = useSession();
  const user = session?.user as any;
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const [sRes, mRes] = await Promise.all([
      fetch(`/api/suggestions?userId=${user.id}`, { cache: 'no-store' }),
      fetch(`/api/metrics?userId=${user.id}`, { cache: 'no-store' }),
    ]);
    setSuggestions(await sRes.json());
    setMetrics(await mRes.json());
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generateInsight = async () => {
    if (!user) return;
    setIsGenerating(true);
    await fetch('/api/suggestions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, metrics: metrics.slice(0, 5) }),
    });
    fetchData();
    setIsGenerating(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header CTA */}
        <div className="flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-blue-950/50 to-purple-950/30 border border-blue-900/30">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-blue-400" /> {t("AI-Powered Coaching")}</h2>
            <p className="text-zinc-400 text-sm mt-1">{t("Personalized analysis based on your health metrics and workout patterns.")}</p>
          </div>
          <Button onClick={generateInsight} isLoading={isGenerating} className="gap-2 shrink-0">
            <RefreshCw className="w-4 h-4" /> {t("Generate New Insight")}</Button>
        </div>

        {/* Insight Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <Card className="border-zinc-800">
            <CardContent className="py-16 text-center">
              <BrainCircuit className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 font-medium">{t("No insights yet.")}</p>
              <p className="text-zinc-600 text-sm mt-1">{t("Log health metrics for a few days, then generate your first AI insight.")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((s) => {
              const { label, color, Icon } = typeConfig[s.type];
              return (
                <div key={s.id} className={cn('p-5 rounded-2xl border', color)}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</span>
                    <span className="ml-auto text-[10px] opacity-50">{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{s.suggestion}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Metrics needed notice */}
        {metrics.length < 3 && !isLoading && (
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-400">
            {t("💡 Tip: AI insights improve with more data. You have")}<strong>{metrics.length}</strong> {t("metrics logged. Log daily for richer analysis.")}</div>
        )}
      </div>
    </DashboardLayout>
  );
}
