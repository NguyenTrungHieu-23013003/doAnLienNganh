'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/FormFields';
import { HealthMetric } from '@/shared/types';
import { useSession } from 'next-auth/react';
import { Heart, Activity, Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useTranslation } from "react-i18next";

function SparkLine({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 100;
  const h = 40;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendIcon({ values }: { values: number[] }) {
  if (values.length < 2) return <Minus className="w-4 h-4 text-zinc-500" />;
  const diff = values[0] - values[values.length - 1];
  if (Math.abs(diff) < 0.1) return <Minus className="w-4 h-4 text-zinc-500" />;
  return diff > 0
    ? <TrendingDown className="w-4 h-4 text-green-400" />
    : <TrendingUp className="w-4 h-4 text-red-400" />;
}

export default function UserMetricsPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const user = session?.user as { id: string; role: string; fullName: string; name: string | null } | undefined;
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ weight: '', height: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchMetrics = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`/api/metrics?userId=${user.id}`, { cache: 'no-store' });
    const data: HealthMetric[] = await res.json();
    setMetrics(data);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMetrics();
  }, [fetchMetrics]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    
    let bodyFatPercentage = 0;
    const w = parseFloat(form.weight);
    const h = parseFloat(form.height);
    if (!isNaN(w) && !isNaN(h) && h > 0) {
      const heightInMeters = h / 100;
      const bmi = w / (heightInMeters * heightInMeters);
      bodyFatPercentage = parseFloat(Math.max((1.2 * bmi) - 10.45, 5).toFixed(1)); 
    }

    await fetch('/api/metrics', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, weight: form.weight, bodyFatPercentage }),
    });
    setSuccess(true);
    setForm({ weight: '', height: '' });
    setTimeout(() => setSuccess(false), 3000);
    fetchMetrics();
    setIsSubmitting(false);
  };

  // Chronological order for charts (oldest first)
  const chronological = [...metrics].reverse();
  const weights = chronological.map((m) => m.weight);
  const bodyFats = chronological.map((m) => m.bodyFatPercentage);

  const latest = metrics[0];
  const prev = metrics[1];

  const statCards = latest ? [
    {
      label: 'Weight', value: `${latest.weight} kg`, prev: prev?.weight,
      values: weights, color: '#3b82f6', icon: Scale,
      diff: prev ? (latest.weight - prev.weight).toFixed(1) : null,
    },
    {
      label: 'Body Fat', value: `${latest.bodyFatPercentage}%`, prev: prev?.bodyFatPercentage,
      values: bodyFats, color: '#f59e0b', icon: Activity,
      diff: prev ? (latest.bodyFatPercentage - prev.bodyFatPercentage).toFixed(1) : null,
    },
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Stat Cards with sparklines */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
          )) : statCards.map((s) => (
            <Card key={s.label} className="border-zinc-800 overflow-hidden">
              <CardContent className="pt-5 pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{s.label}</p>
                    <p className="text-3xl font-bold mt-1">{s.value}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {s.diff !== null && (
                      <span className={`text-xs font-bold ${parseFloat(s.diff) === 0 ? 'text-zinc-500' : parseFloat(s.diff) < 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {parseFloat(s.diff) > 0 ? '+' : ''}{s.diff}
                      </span>
                    )}
                    <TrendIcon values={s.values} />
                  </div>
                </div>
                <SparkLine values={s.values} color={s.color} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Log Form */}
          <Card className="border-zinc-800">
            <CardHeader title="Log Today's Metrics" subtitle="Track your daily health data" />
            <CardContent>
              {success && (
                <div className="mb-4 p-3 rounded-lg bg-green-600/10 border border-green-600/20 text-green-400 text-sm font-medium">
                  {t("✓ Metrics logged successfully!")}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input id="weight" type="number" step="0.1" label="Cân nặng (kg)" placeholder="Ví dụ: 72.5"
                  value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} required />
                <Input id="height" type="number" step="0.1" label="Chiều cao (cm)" placeholder="Ví dụ: 175"
                   value={form.height} onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))} required />
                <Button type="submit" className="w-full py-5" isLoading={isSubmitting}>{t("Submit Metrics")}</Button>
              </form>
            </CardContent>
          </Card>

          {/* History Table */}
          <Card className="border-zinc-800 lg:col-span-2">
            <CardHeader title="Metrics History" subtitle="Last 10 readings" />
            <CardContent className="p-0">
              {metrics.length === 0 ? (
                <div className="text-center py-16 text-zinc-600 text-sm">{t("No metrics logged yet. Start tracking today!")}</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-3 text-left">{t("Date")}</th>
                      <th className="px-6 py-3 text-right">{t("Weight")}</th>
                      <th className="px-6 py-3 text-right">{t("Body Fat")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.slice(0, 10).map((m, idx) => (
                      <tr key={m.id} className={`border-b border-zinc-900 ${idx === 0 ? 'text-white' : 'text-zinc-400'}`}>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            {idx === 0 && <span className="text-[9px] font-bold text-blue-400 bg-blue-600/10 px-1.5 py-0.5 rounded uppercase">{t("Latest")}</span>}
                            {new Date(m.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono">{m.weight} {t("kg")}</td>
                        <td className="px-6 py-3.5 text-right font-mono">{m.bodyFatPercentage ? `${m.bodyFatPercentage}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
