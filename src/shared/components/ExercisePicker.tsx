'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Dumbbell, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { cn } from '@/lib/utils';
import type { Exercise } from '@/lib/exercises';

interface ExercisePickerProps {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

const PAGE = 12;

export function ExercisePicker({ onSelect, onClose }: ExercisePickerProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [equipment, setEquipment] = useState('');
  const [results, setResults] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [meta, setMeta] = useState<{ categories: string[]; equipment: string[] }>({
    categories: [], equipment: [],
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/exercises?meta=true').then((r) => r.json()).then(setMeta);
    // Load first batch on mount
    fetch(`/api/exercises?limit=${PAGE}`).then((r) => r.json()).then(setResults);
  }, []);

  const search = useCallback(async (q: string, cat: string, eq: string) => {
    setIsLoading(true);
    const params = new URLSearchParams({ limit: String(PAGE) });
    if (q) params.set('q', q);
    if (cat) params.set('category', cat);
    if (eq) params.set('equipment', eq);
    const res = await fetch(`/api/exercises?${params}`);
    setResults(await res.json());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query, category, equipment), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, category, equipment, search]);

  return (
    <div className="flex flex-col gap-3" style={{ minHeight: 420 }}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm bài tập (tên, cơ bắp, thiết bị)..."
          className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-blue-500"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 text-xs focus:outline-none focus:border-blue-500 capitalize"
        >
          <option value="">Tất cả nhóm cơ</option>
          {meta.categories.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
        <select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 text-xs focus:outline-none focus:border-blue-500 capitalize"
        >
          <option value="">Tất cả thiết bị</option>
          {meta.equipment.map((e) => <option key={e} value={e} className="capitalize">{e}</option>)}
        </select>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-1.5 max-h-72 pr-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-zinc-900/60 animate-pulse border border-zinc-800/50" />
          ))
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 text-sm">
            <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Không tìm thấy bài tập phù hợp
          </div>
        ) : (
          results.map((ex) => (
            <button
              key={ex.id}
              onClick={() => onSelect(ex)}
              className="w-full text-left p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:border-blue-600/40 hover:bg-blue-600/5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-blue-600/10 border border-blue-600/20 shrink-0">
                  <Dumbbell className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{ex.name}</p>
                  <p className="text-[11px] text-zinc-500 capitalize">{ex.category} · {ex.target} · {ex.equipment}</p>
                </div>
                <CheckCircle2 className={cn('w-4 h-4 shrink-0 transition-opacity', 'opacity-0 group-hover:opacity-100 text-blue-400')} />
              </div>
            </button>
          ))
        )}
      </div>

      <div className="flex justify-end pt-1 border-t border-zinc-800">
        <Button variant="outline" size="sm" onClick={onClose}>Đóng</Button>
      </div>
    </div>
  );
}
