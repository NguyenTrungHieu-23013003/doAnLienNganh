/**
 * exercises.ts — Local Exercise Search Engine
 *
 * Provides RAG-lite (Retrieval-Augmented Generation) search over
 * the bundled exercises.json dataset (1,324 exercises).
 *
 * Usage:
 *   import { searchExercises, getExerciseContext } from '@/lib/exercises';
 */

import fs from 'fs';
import path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  category: string;
  body_part: string;
  equipment: string;
  instructions: {
    en?: string;
    es?: string;
    it?: string;
    tr?: string;
    ru?: string;
    zh?: string;
    vi?: string;
  };
  instruction_steps?: string[];
  muscle_group: string;
  secondary_muscles: string[];
  target: string;
  image: string | null;
  gif_url: string | null;
  media_id: string;
}

export interface SearchFilters {
  category?: string;
  equipment?: string;
  body_part?: string;
  target?: string;
  muscle_group?: string;
}

// ─── Dataset (lazy singleton) ─────────────────────────────────────────────────

let _exercises: Exercise[] | null = null;

function getExercises(): Exercise[] {
  if (_exercises) return _exercises;
  const filePath = path.join(process.cwd(), 'public', 'data', 'exercises.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  _exercises = JSON.parse(raw) as Exercise[];
  return _exercises;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalize a string: lowercase, trim, remove accents for fuzzy matching.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Score an exercise against a free-text query.
 * Higher score = better match.
 */
function scoreExercise(exercise: Exercise, query: string): number {
  const q = normalize(query);
  const words = q.split(/\s+/).filter(Boolean);

  let score = 0;

  const fields = [
    exercise.name,
    exercise.category,
    exercise.body_part,
    exercise.equipment,
    exercise.target,
    exercise.muscle_group,
    ...(exercise.secondary_muscles || []),
    exercise.instructions?.en ?? '',
  ].map(normalize);

  for (const word of words) {
    for (const field of fields) {
      if (field === word) score += 10;          // exact match
      else if (field.startsWith(word)) score += 5;  // prefix match
      else if (field.includes(word)) score += 2;    // substring match
    }
  }

  return score;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Search exercises by free-text query and optional structured filters.
 *
 * @param query   - Natural language query, e.g. "chest dumbbell"
 * @param filters - Structured filters (category, equipment, etc.)
 * @param limit   - Max results to return (default: 5)
 */
export function searchExercises(
  query: string,
  filters: SearchFilters = {},
  limit = 5
): Exercise[] {
  let results = getExercises();

  // Apply structured filters first (fast)
  if (filters.category) {
    const cat = normalize(filters.category);
    results = results.filter((e) => normalize(e.category).includes(cat));
  }
  if (filters.equipment) {
    const eq = normalize(filters.equipment);
    results = results.filter((e) => normalize(e.equipment).includes(eq));
  }
  if (filters.body_part) {
    const bp = normalize(filters.body_part);
    results = results.filter((e) => normalize(e.body_part).includes(bp));
  }
  if (filters.target) {
    const tg = normalize(filters.target);
    results = results.filter(
      (e) =>
        normalize(e.target).includes(tg) ||
        e.secondary_muscles?.some((m) => normalize(m).includes(tg))
    );
  }
  if (filters.muscle_group) {
    const mg = normalize(filters.muscle_group);
    results = results.filter((e) => normalize(e.muscle_group).includes(mg));
  }

  // Score and sort if there's a text query
  if (query.trim()) {
    const scored = results.map((e) => ({ exercise: e, score: scoreExercise(e, query) }));
    scored.sort((a, b) => b.score - a.score);
    results = scored.filter((s) => s.score > 0).map((s) => s.exercise);
    // If no scored matches, fall back to unfiltered results
    if (results.length === 0) results = scored.map((s) => s.exercise);
  }

  return results.slice(0, limit);
}

/**
 * Get exercises by equipment type.
 */
export function getExercisesByEquipment(equipment: string, limit = 10): Exercise[] {
  return getExercises()
    .filter((e) => normalize(e.equipment).includes(normalize(equipment)))
    .slice(0, limit);
}

/**
 * Get exercises by target muscle.
 */
export function getExercisesByMuscle(muscle: string, limit = 10): Exercise[] {
  const m = normalize(muscle);
  return getExercises()
    .filter(
      (e) =>
        normalize(e.target).includes(m) ||
        normalize(e.muscle_group).includes(m) ||
        e.secondary_muscles?.some((s) => normalize(s).includes(m))
    )
    .slice(0, limit);
}

/**
 * Get exercises by category (body part group).
 */
export function getExercisesByCategory(category: string, limit = 10): Exercise[] {
  const cat = normalize(category);
  return getExercises()
    .filter((e) => normalize(e.category).includes(cat) || normalize(e.body_part).includes(cat))
    .slice(0, limit);
}

/**
 * Get a single exercise by ID.
 */
export function getExerciseById(id: string): Exercise | undefined {
  return getExercises().find((e) => e.id === id);
}

/**
 * Get all unique values for a given field (for filter dropdowns).
 */
export function getUniqueValues(field: keyof Pick<Exercise, 'category' | 'equipment' | 'body_part' | 'target' | 'muscle_group'>): string[] {
  const values = new Set<string>();
  getExercises().forEach((e) => {
    const v = e[field];
    if (v) values.add(v);
  });
  return Array.from(values).sort();
}

/**
 * Build a concise context string for an LLM system prompt.
 * Converts a list of exercises into readable text for RAG injection.
 */
export function buildExerciseContext(found: Exercise[]): string {
  if (found.length === 0) return '';

  return found
    .map(
      (e) =>
        `• **${e.name}** (${e.category}, targets: ${e.target}${e.secondary_muscles?.length ? ', ' + e.secondary_muscles.slice(0, 2).join(', ') : ''})
  Equipment: ${e.equipment}
  How-to: ${e.instructions?.en?.slice(0, 200) ?? 'No instructions available'}...`
    )
    .join('\n\n');
}

/**
 * High-level helper: given a user's natural language message,
 * extract relevant exercises and return a ready-to-inject context block.
 *
 * @param userMessage - The raw user message
 * @param limit       - Max exercises to include (default: 4)
 */
export function getExerciseContext(userMessage: string, limit = 4): string {
  const found = searchExercises(userMessage, {}, limit);
  if (found.length === 0) return '';
  return `\n\n## Relevant exercises from the fitness database:\n${buildExerciseContext(found)}`;
}

/**
 * Dataset statistics (for monitoring/admin).
 */
export function getDatasetStats() {
  return {
    total: getExercises().length,
    categories: getUniqueValues('category').length,
    equipmentTypes: getUniqueValues('equipment').length,
    targetMuscles: getUniqueValues('target').length,
  };
}
