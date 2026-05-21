import { NextResponse } from 'next/server';
import { readDb, addItem } from '@/lib/mockDb';
import { HealthMetric } from '@/shared/types';
import crypto from 'crypto';

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
  const { userId, weight, heartRate, bodyFatPercentage } = body;

  if (!userId || weight == null || heartRate == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const newMetric: HealthMetric = {
    id: `metric-${crypto.randomUUID()}`,
    userId,
    weight: parseFloat(weight),
    heartRate: parseInt(heartRate),
    bodyFatPercentage: parseFloat(bodyFatPercentage) || 0,
    recordedAt: new Date().toISOString(),
  };

  await addItem('metrics', newMetric);
  return NextResponse.json(newMetric, { status: 201 });
}
