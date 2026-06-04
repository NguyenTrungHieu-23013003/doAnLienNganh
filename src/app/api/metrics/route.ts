import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { awardXp } from '@/lib/xp';

// GET /api/metrics?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  let query = supabase.from('metrics').select('*').order('recordedAt', { ascending: false });
  if (userId) query = query.eq('userId', userId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/metrics
export async function POST(request: Request) {
  const body = await request.json();
  const { userId, weight, height, bodyFatPercentage } = body;

  if (!userId || weight == null || height == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const newMetric = {
    userId,
    weight: parseFloat(weight),
    height: parseFloat(height),
    bodyFatPercentage: parseFloat(bodyFatPercentage) || 0,
  };

  const { data: created, error } = await supabase.from('metrics').insert(newMetric).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await awardXp(userId, 'metrics');
  } catch (e) {
    console.error('Award XP failed:', e);
  }

  return NextResponse.json(created, { status: 201 });
}
