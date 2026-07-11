import { NextResponse } from 'next/server';
import {
  searchExercises,
  getExercisesByCategory,
  getExercisesByEquipment,
  getExercisesByMuscle,
  getUniqueValues,
  getDatasetStats,
  type SearchFilters,
} from '@/lib/exercises';

/**
 * GET /api/exercises
 *
 * Query params:
 *   q          - free-text search query
 *   category   - filter by category (e.g. "chest")
 *   equipment  - filter by equipment (e.g. "dumbbell")
 *   body_part  - filter by body part
 *   target     - filter by target muscle
 *   muscle_group - filter by muscle group
 *   limit      - max results (default: 10, max: 50)
 *   stats      - if "true", return dataset statistics
 *   meta       - if "true", return unique filter values
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Return dataset stats
  if (searchParams.get('stats') === 'true') {
    return NextResponse.json(getDatasetStats());
  }

  // Return metadata for filter dropdowns
  if (searchParams.get('meta') === 'true') {
    return NextResponse.json({
      categories: getUniqueValues('category'),
      equipment: getUniqueValues('equipment'),
      targets: getUniqueValues('target'),
      muscle_groups: getUniqueValues('muscle_group'),
    });
  }

  const q = searchParams.get('q') ?? '';
  const limitParam = parseInt(searchParams.get('limit') ?? '10', 10);
  const limit = Math.min(Math.max(1, limitParam), 50); // clamp to [1, 50]

  const filters: SearchFilters = {};
  if (searchParams.get('category')) filters.category = searchParams.get('category')!;
  if (searchParams.get('equipment')) filters.equipment = searchParams.get('equipment')!;
  if (searchParams.get('body_part')) filters.body_part = searchParams.get('body_part')!;
  if (searchParams.get('target')) filters.target = searchParams.get('target')!;
  if (searchParams.get('muscle_group')) filters.muscle_group = searchParams.get('muscle_group')!;

  // Convenience shortcuts when no query provided
  if (!q) {
    if (filters.category) {
      return NextResponse.json(getExercisesByCategory(filters.category, limit));
    }
    if (filters.equipment) {
      return NextResponse.json(getExercisesByEquipment(filters.equipment, limit));
    }
    if (filters.target) {
      return NextResponse.json(getExercisesByMuscle(filters.target, limit));
    }
  }

  const results = searchExercises(q, filters, limit);
  return NextResponse.json(results);
}
