import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  searchExercises,
  getExercisesByCategory,
  getExercisesByEquipment,
  getExercisesByMuscle,
  getUniqueValues,
  getDatasetStats,
  type SearchFilters,
} from '@/lib/exercises';

export async function GET(request: Request) {
  // [SEC] Kiểm tra xác thực
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
