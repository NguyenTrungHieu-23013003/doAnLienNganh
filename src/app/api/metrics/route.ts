import { NextResponse } from 'next/server';
import { readDb, addItem } from '@/lib/mockDb';
import { HealthMetric } from '@/shared/types';

// GET /api/metrics?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  let metrics = await readDb<HealthMetric>('metrics');
  if (userId) metrics = metrics.filter((m) => m.userId === userId);
  metrics.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  return NextResponse.json(metrics, { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/metrics
export async function POST(request: Request) {
  const body = await request.json();
  const { userId, weight, height, heartRate = 0, bodyFatPercentage } = body;

  if (!userId || weight == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const newMetric = {
    userId,
    weight: parseFloat(weight),
    heartRate: parseInt(heartRate as string) || 0,
    bodyFatPercentage: parseFloat(bodyFatPercentage) || 0,
  };

  const created = await addItem('metrics', newMetric);

  fetch(new URL('/api/xp/award', request.url), {
    method: 'POST',
    body: JSON.stringify({ userId, action: 'metrics' })
  }).catch(e => console.error('Award XP failed:', e));

  return NextResponse.json(created ?? newMetric, { status: 201 });
}
