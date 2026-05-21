import { NextResponse } from 'next/server';
import { readDb, addItem } from '@/lib/mockDb';
import { AISuggestion } from '@/shared/types';
import crypto from 'crypto';

// GET /api/suggestions?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  let suggestions = await readDb<AISuggestion>('suggestions');
  if (userId) suggestions = suggestions.filter((s) => s.userId === userId);
  suggestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(suggestions, { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/suggestions — generate a new AI suggestion (mock)
export async function POST(request: Request) {
  const body = await request.json();
  const { userId, taskId, metrics } = body;

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  // Mock AI logic based on latest metrics trend
  let suggestion = '';
  let type: AISuggestion['type'] = 'insight';

  if (metrics && metrics.length >= 2) {
    const latest = metrics[0];
    const prev = metrics[1];
    const weightDiff = (latest.weight - prev.weight).toFixed(1);
    const hrDiff = latest.heartRate - prev.heartRate;

    if (parseFloat(weightDiff) < 0) {
      suggestion = `Great progress! Your weight dropped by ${Math.abs(parseFloat(weightDiff))}kg since last check. Maintain your current nutrition plan for continued results.`;
      type = 'insight';
    } else if (hrDiff > 5) {
      suggestion = `Your resting heart rate has increased by ${hrDiff} bpm. This may indicate accumulated fatigue. Consider a recovery day with light stretching only.`;
      type = 'warning';
    } else {
      suggestion = `Your metrics are stable. Consider increasing workout intensity by 5–10% this week to break the plateau. Focus on progressive overload.`;
      type = 'adjustment';
    }
  } else {
    suggestion = 'Log 3+ days of health metrics to unlock personalized AI insights and training recommendations.';
    type = 'insight';
  }

  const newSuggestion: AISuggestion = {
    id: `ai-${crypto.randomUUID()}`,
    userId,
    taskId: taskId || undefined,
    suggestion,
    type,
    createdAt: new Date().toISOString(),
  };

  await addItem('suggestions', newSuggestion);
  return NextResponse.json(newSuggestion, { status: 201 });
}
