'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { cn } from '@/lib/utils';
import {
  Search, Dumbbell, Filter, X, ChevronRight, Target, Layers,
  Package, BookOpen, CheckCircle2, Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Exercise } from '@/lib/exercises';

// ── Category color map ─────────────────────────────────────────
const categoryColors: Record<string, string> = {
  chest:       'text-red-400 bg-red-600/10 border-red-600/20',
  back:        'text-blue-400 bg-blue-600/10 border-blue-600/20',
  waist:       'text-amber-400 bg-amber-600/10 border-amber-600/20',
  'upper arms':'text-purple-400 bg-purple-600/10 border-purple-600/20',
  'lower arms':'text-pink-400 bg-pink-600/10 border-pink-600/20',
  shoulders:   'text-cyan-400 bg-cyan-600/10 border-cyan-600/20',
  'upper legs':'text-green-400 bg-green-600/10 border-green-600/20',
  'lower legs':'text-teal-400 bg-teal-600/10 border-teal-600/20',
  cardio:      'text-orange-400 bg-orange-600/10 border-orange-600/20',
  neck:        'text-zinc-400 bg-zinc-600/10 border-zinc-600/20',
};
const getCategoryColor = (cat: string) =>
  categoryColors[cat.toLowerCase()] ?? 'text-zinc-400 bg-zinc-600/10 border-zinc-600/20';

// ── Muscle chip ───────────────────────────────────────────────
const MuscleChip = ({ label, primary = false }: { label: string; primary?: boolean }) => (
  <span className={cn(
    'px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize',
    primary
      ? 'bg-blue-600/15 text-blue-300 border-blue-600/25'
      : 'bg-zinc-700/30 text-zinc-400 border-zinc-700/40'
  )}>
    {label}
  </span>
);

// ── Exercise card ────────────────────────────────────────────────
function ExerciseCard({
  exercise,
  isSelected,
  onClick,
}: {
  exercise: Exercise;
  isSelected: boolean;
  onClick: () => void;
}) {
  const catColor = getCategoryColor(exercise.category);
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all duration-200 group',
        isSelected
          ? 'border-blue-600/40 bg-blue-600/5 shadow-lg shadow-blue-900/10'
          : 'border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg border shrink-0', catColor)}>
          <Dumbbell className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white leading-tight line-clamp-2">{exercise.name}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize', catColor)}>
              {exercise.category}
            </span>
            <MuscleChip label={exercise.target} primary />
            {exercise.secondary_muscles?.[0] && (
              <MuscleChip label={exercise.secondary_muscles[0]} />
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1.5 flex items-center gap-1">
            <Package className="w-3 h-3" />
            {exercise.equipment}
          </p>
        </div>
        {isSelected && <ChevronRight className="w-4 h-4 text-blue-400 shrink-0 mt-1" />}
      </div>
    </button>
  );
}

// ── Instruction steps component ────────────────────────────────
function InstructionSteps({ exercise, lang }: { exercise: Exercise; lang: string }) {
  // If we have step-by-step instructions in the target language, use them
  const steps = exercise.instruction_steps
    ? (exercise.instruction_steps as unknown as Record<string, string[]>)[lang]
    : null;

  if (steps && Array.isArray(steps) && steps.length > 0) {
    return (
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-zinc-300 leading-relaxed">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    );
  }

  // Otherwise, fallback to the paragraph instruction in target language, or then English step-by-step, or English paragraph
  const paragraph = exercise.instructions?.[lang as keyof typeof exercise.instructions];
  if (paragraph) {
    return <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{paragraph}</p>;
  }

  const fallbackSteps = exercise.instruction_steps
    ? (exercise.instruction_steps as unknown as Record<string, string[]>)['en']
    : null;

  if (fallbackSteps && Array.isArray(fallbackSteps) && fallbackSteps.length > 0) {
    return (
      <ol className="space-y-2">
        {fallbackSteps.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-zinc-300 leading-relaxed">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    );
  }

  const fallbackParagraph = exercise.instructions?.en;
  return <p className="text-sm text-zinc-300 leading-relaxed">{fallbackParagraph ?? 'No instructions available.'}</p>;
}

// ── Main page ─────────────────────────────────────────────────────
const PAGE_SIZE = 20;

export default function UserExercisesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('vi') ? 'vi' : 'en';

  // Search / filter state
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterEquipment, setFilterEquipment] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Results state
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Meta (filter options)
  const [meta, setMeta] = useState<{ categories: string[]; equipment: string[]; targets: string[] }>({
    categories: [], equipment: [], targets: [],
  });

  // Selected exercise detail
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [isSendingToCoach, setIsSendingToCoach] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load filter meta once
  useEffect(() => {
    fetch('/api/exercises?meta=true')
      .then((r) => r.json())
      .then(setMeta);
    fetch('/api/exercises?stats=true')
      .then((r) => r.json())
      .then((s) => setTotal(s.total));
  }, []);

  // Fetch exercises
  const fetchExercises = useCallback(async (q: string, cat: string, eq: string, tg: string, p: number) => {
    setIsLoading(true);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE * p) });
    if (q) params.set('q', q);
    if (cat) params.set('category', cat);
    if (eq) params.set('equipment', eq);
    if (tg) params.set('target', tg);

    const res = await fetch(`/api/exercises?${params}`);
    const data: Exercise[] = await res.json();
    setExercises(data);
    setHasMore(data.length === PAGE_SIZE * p);
    setIsLoading(false);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchExercises(query, filterCategory, filterEquipment, filterTarget, 1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, filterCategory, filterEquipment, filterTarget, fetchExercises]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchExercises(query, filterCategory, filterEquipment, filterTarget, next);
  };

  const clearFilters = () => {
    setQuery('');
    setFilterCategory('');
    setFilterEquipment('');
    setFilterTarget('');
    inputRef.current?.focus();
  };

  const hasActiveFilter = !!(query || filterCategory || filterEquipment || filterTarget);

  // "Add to My Requests" — user can bookmark/request an exercise
  const handleBookmark = async () => {
    if (!selected) return;
    setIsSendingToCoach(true);
    // Store as a suggestion/note to coach via notifications
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Yêu cầu bài tập mới',
        message: `Học viên muốn luyện tập: ${selected.name} (${selected.category}, ${selected.equipment})`,
        forCoach: true,
      }),
    }).catch(() => null); // non-critical
    window.dispatchEvent(new CustomEvent('refresh-notifications'));
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3000);
    setIsSendingToCoach(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-blue-400" />
              {t('Exercise Library')}
            </h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {t('Browse')} <span className="text-blue-400 font-bold">{total.toLocaleString()}</span>{' '}
              {t('exercises — search, filter, and explore')}
            </p>
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
              showFilters || hasActiveFilter
                ? 'border-blue-600/40 bg-blue-600/10 text-blue-300'
                : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600'
            )}
          >
            <Filter className="w-4 h-4" />
            {t('Filters')}
            {hasActiveFilter && (
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            ref={inputRef}
            id="exercise-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Search by name, muscle, equipment...') || 'Search by name, muscle, equipment...'}
            className="w-full pl-11 pr-10 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Category */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('Category')}</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 capitalize"
                >
                  <option value="">{t('All categories')}</option>
                  {meta.categories.map((c) => (
                    <option key={c} value={c} className="capitalize">{c}</option>
                  ))}
                </select>
              </div>

              {/* Equipment */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('Equipment')}</label>
                <select
                  value={filterEquipment}
                  onChange={(e) => setFilterEquipment(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 capitalize"
                >
                  <option value="">{t('All equipment')}</option>
                  {meta.equipment.map((e) => (
                    <option key={e} value={e} className="capitalize">{e}</option>
                  ))}
                </select>
              </div>

              {/* Target muscle */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('Target muscle')}</label>
                <select
                  value={filterTarget}
                  onChange={(e) => setFilterTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 capitalize"
                >
                  <option value="">{t('All muscles')}</option>
                  {meta.targets.map((m) => (
                    <option key={m} value={m} className="capitalize">{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {hasActiveFilter && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> {t('Clear all filters')}
              </button>
            )}
          </div>
        )}

        {/* Master-detail grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── Left: exercise list ── */}
          <div className="lg:col-span-2 space-y-2">
            {/* Result count */}
            <p className="text-xs text-zinc-600 px-1">
              {isLoading ? (
                <span className="animate-pulse">{t('Searching...')}</span>
              ) : exercises.length === 0 && hasActiveFilter ? (
                t('No exercises found. Try different filters.')
              ) : exercises.length > 0 ? (
                <>
                  <span className="text-zinc-400 font-medium">{exercises.length}</span>{' '}
                  {t('exercises shown')}
                  {hasActiveFilter && ` (${t('filtered')})`}
                </>
              ) : null}
            </p>

            {/* List */}
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {isLoading && exercises.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-xl bg-zinc-900/50 animate-pulse border border-zinc-800/50" />
                ))
              ) : exercises.length === 0 ? (
                <div className="text-center py-16 text-zinc-700 border-2 border-dashed border-zinc-800 rounded-xl">
                  <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{t('Search for an exercise above')}</p>
                </div>
              ) : (
                <>
                  {exercises.map((ex) => (
                    <ExerciseCard
                      key={ex.id}
                      exercise={ex}
                      isSelected={selected?.id === ex.id}
                      onClick={() => { setSelected(ex); setSentSuccess(false); }}
                    />
                  ))}
                  {hasMore && (
                    <Button
                      variant="outline"
                      className="w-full mt-2 text-xs"
                      onClick={loadMore}
                      isLoading={isLoading}
                    >
                      {t('Load more')}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Right: exercise detail ── */}
          <div className="lg:col-span-3">
            {selected ? (
              <Card className="border-zinc-800 animate-fade-in sticky top-4">
                <CardHeader
                  title={selected.name}
                  subtitle={`${selected.category} · ${selected.equipment}`}
                >
                  <button
                    onClick={() => setSelected(null)}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Category + target tags */}
                  <div className="flex flex-wrap gap-2">
                    <span className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold capitalize', getCategoryColor(selected.category))}>
                      <Layers className="w-3.5 h-3.5" /> {selected.category}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold bg-blue-600/10 text-blue-300 border-blue-600/20 capitalize">
                      <Target className="w-3.5 h-3.5" /> {selected.target}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold bg-zinc-700/30 text-zinc-400 border-zinc-700/40 capitalize">
                      <Package className="w-3.5 h-3.5" /> {selected.equipment}
                    </span>
                  </div>

                  {/* Muscles */}
                  {selected.secondary_muscles?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                        {t('Secondary muscles')}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.secondary_muscles.map((m) => (
                          <MuscleChip key={m} label={m} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> {t('Instructions')}
                    </p>
                    <InstructionSteps exercise={selected} lang={lang} />
                  </div>

                  {/* Action: suggest to coach */}
                  <div className="pt-2 border-t border-zinc-800">
                    {sentSuccess ? (
                      <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        {t('Request sent to your coach!')}
                      </div>
                    ) : (
                      <Button
                        onClick={handleBookmark}
                        isLoading={isSendingToCoach}
                        className="gap-2 bg-blue-600/80 hover:bg-blue-600 text-sm"
                      >
                        <Zap className="w-4 h-4" />
                        {t('Request this exercise from Coach')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center h-72 text-zinc-700 text-sm border-2 border-dashed border-zinc-800 rounded-2xl gap-3">
                <Dumbbell className="w-12 h-12 opacity-20" />
                <p>{t('Select an exercise to see details and instructions')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
