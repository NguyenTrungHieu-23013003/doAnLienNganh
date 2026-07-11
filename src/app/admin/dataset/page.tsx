'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { cn } from '@/lib/utils';
import {
  Database, Dumbbell, Target, Package, Layers,
  Search, BarChart3, RefreshCw, TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Exercise } from '@/lib/exercises';

interface DatasetStats {
  total: number;
  categories: number;
  equipmentTypes: number;
  targetMuscles: number;
}
interface Meta {
  categories: string[];
  equipment: string[];
  targets: string[];
  muscle_groups: string[];
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({
  icon, label, value, color, sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  sub?: string;
}) {
  return (
    <div className={cn('p-5 rounded-2xl border flex items-start gap-4', color)}>
      <div className="p-2.5 rounded-xl bg-white/5 shrink-0">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        <p className="text-xs font-bold uppercase tracking-wider opacity-70 mt-0.5">{label}</p>
        {sub && <p className="text-[11px] opacity-50 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Distribution bar ──────────────────────────────────────────
function DistBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = Math.round((count / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-300 capitalize font-medium truncate max-w-[160px]">{label}</span>
        <span className="text-zinc-500 shrink-0 ml-2">{count} <span className="text-zinc-700">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminDatasetPage() {
  const { t } = useTranslation();

  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [categoryDist, setCategoryDist] = useState<{ name: string; count: number }[]>([]);
  const [equipmentDist, setEquipmentDist] = useState<{ name: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Live search preview
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const [statsRes, metaRes] = await Promise.all([
        fetch('/api/exercises?stats=true'),
        fetch('/api/exercises?meta=true'),
      ]);
      const statsData: DatasetStats = await statsRes.json();
      const metaData: Meta = await metaRes.json();
      setStats(statsData);
      setMeta(metaData);

      // Build category distribution
      const catCounts = await Promise.all(
        metaData.categories.slice(0, 10).map(async (cat) => {
          const res = await fetch(`/api/exercises?category=${encodeURIComponent(cat)}&limit=50`);
          const data: Exercise[] = await res.json();
          return { name: cat, count: data.length };
        })
      );
      catCounts.sort((a, b) => b.count - a.count);
      setCategoryDist(catCounts);

      // Build equipment distribution (top 10)
      const eqCounts = await Promise.all(
        metaData.equipment.slice(0, 10).map(async (eq) => {
          const res = await fetch(`/api/exercises?equipment=${encodeURIComponent(eq)}&limit=50`);
          const data: Exercise[] = await res.json();
          return { name: eq, count: data.length };
        })
      );
      eqCounts.sort((a, b) => b.count - a.count);
      setEquipmentDist(eqCounts);

      setIsLoading(false);
    }
    load();
  }, []);

  // Live search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearching(true);
      const res = await fetch(`/api/exercises?q=${encodeURIComponent(searchQuery)}&limit=6`);
      setSearchResults(await res.json());
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const maxCat = Math.max(...categoryDist.map((c) => c.count), 1);
  const maxEq  = Math.max(...equipmentDist.map((e) => e.count), 1);

  const catBarColors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500',
    'bg-red-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
    'bg-orange-500', 'bg-indigo-500',
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/50 to-purple-950/40 border border-blue-900/25">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                <Database className="w-5 h-5 text-blue-400" />
                {t('Exercise Dataset Stats')}
              </h1>
              <p className="text-zinc-400 text-sm">
                {t('Local dataset powering RAG-lite AI — no external API needed for exercise knowledge')}
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600/10 border border-green-600/20 text-green-400 text-xs font-semibold">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {t('Dataset active')}
            </div>
          </div>
        </div>

        {/* Stat cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-zinc-900/60 animate-pulse border border-zinc-800" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Dumbbell className="w-5 h-5 text-blue-400" />}
              label={t('Total exercises')}
              value={stats.total}
              color="border-blue-900/30 bg-blue-950/20"
              sub="From ExerciseDB dataset"
            />
            <StatCard
              icon={<Layers className="w-5 h-5 text-purple-400" />}
              label={t('Categories')}
              value={stats.categories}
              color="border-purple-900/30 bg-purple-950/20"
              sub="Body part groups"
            />
            <StatCard
              icon={<Package className="w-5 h-5 text-amber-400" />}
              label={t('Equipment types')}
              value={stats.equipmentTypes}
              color="border-amber-900/30 bg-amber-950/20"
              sub="From body weight to machines"
            />
            <StatCard
              icon={<Target className="w-5 h-5 text-green-400" />}
              label={t('Target muscles')}
              value={stats.targetMuscles}
              color="border-green-900/30 bg-green-950/20"
              sub="Primary target muscles"
            />
          </div>
        )}

        {/* Charts + Live search */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Category distribution */}
          <Card className="border-zinc-800 lg:col-span-1">
            <CardHeader
              title={t('By Category')}
              subtitle={t('Exercise count per body region')}
            >
              <BarChart3 className="w-4 h-4 text-zinc-500" />
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-8 rounded bg-zinc-800/60 animate-pulse" />
                ))
              ) : (
                categoryDist.map((c, i) => (
                  <DistBar
                    key={c.name}
                    label={c.name}
                    count={c.count}
                    max={maxCat}
                    color={catBarColors[i % catBarColors.length]}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Equipment distribution */}
          <Card className="border-zinc-800 lg:col-span-1">
            <CardHeader
              title={t('By Equipment')}
              subtitle={t('Top 10 equipment types')}
            >
              <TrendingUp className="w-4 h-4 text-zinc-500" />
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-8 rounded bg-zinc-800/60 animate-pulse" />
                ))
              ) : (
                equipmentDist.map((e, i) => (
                  <DistBar
                    key={e.name}
                    label={e.name}
                    count={e.count}
                    max={maxEq}
                    color="bg-cyan-500"
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Live search test */}
          <Card className="border-zinc-800 lg:col-span-1">
            <CardHeader
              title={t('Live Search Test')}
              subtitle={t('Test RAG search engine')}
            >
              <Search className="w-4 h-4 text-zinc-500" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. chest dumbbell..."
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5 min-h-[160px]">
                {isSearching ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-4 h-4 text-zinc-600 animate-spin" />
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((ex) => (
                    <div key={ex.id} className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800">
                      <p className="text-xs font-semibold text-white truncate">{ex.name}</p>
                      <p className="text-[10px] text-zinc-500 capitalize mt-0.5">
                        {ex.category} · {ex.target} · {ex.equipment}
                      </p>
                    </div>
                  ))
                ) : searchQuery ? (
                  <p className="text-sm text-zinc-600 text-center py-8">{t('No results')}</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-wider mb-2">{t('Available muscle groups')}</p>
                    <div className="flex flex-wrap gap-1">
                      {(meta?.targets ?? []).slice(0, 12).map((tg) => (
                        <button
                          key={tg}
                          onClick={() => setSearchQuery(tg)}
                          className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] hover:bg-zinc-700 hover:text-white transition-colors capitalize"
                        >
                          {tg}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Translation hint */}
              <div className="pt-2 border-t border-zinc-800">
                <p className="text-[10px] text-zinc-600">
                  {t('To add Vietnamese instructions, run:')}
                </p>
                <code className="text-[10px] text-blue-400 block mt-1 bg-zinc-900 px-2 py-1 rounded">
                  node scripts/translate-exercises.js --resume
                </code>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All filter values */}
        {meta && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="border-zinc-800">
              <CardHeader title={t('All Target Muscles')} subtitle={`${meta.targets.length} muscles`} />
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {meta.targets.map((m) => (
                    <span key={m} className="px-2.5 py-1 rounded-full bg-blue-600/10 text-blue-300 border border-blue-600/20 text-xs capitalize">
                      {m}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800">
              <CardHeader title={t('All Equipment Types')} subtitle={`${meta.equipment.length} types`} />
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {meta.equipment.map((e) => (
                    <span key={e} className="px-2.5 py-1 rounded-full bg-amber-600/10 text-amber-300 border border-amber-600/20 text-xs capitalize">
                      {e}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
