import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const { data: user, error: userError } = await supabase.from('users').select('xp, streak').eq('id', userId).single();
    if (userError) throw userError;

    const tasksRes = await fetch(new URL(`/api/tasks?userId=${userId}`, req.url).toString());
    const tasks = tasksRes.ok ? await tasksRes.json() : [];

    const { data: badges } = await supabase.from('badges').select('type, earnedAt').eq('userId', userId);

    return NextResponse.json({ user, tasks, badges: badges || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const { data: user } = await supabase.from('users').select('xp, streak').eq('id', userId).single();
    if (!user) throw new Error('User not found');

    const tasksRes = await fetch(new URL(`/api/tasks?userId=${userId}`, req.url).toString());
    const tasks = tasksRes.ok ? await tasksRes.json() : [];
    
    const doneTasks = tasks.filter((t: any) => t.status === 'done');
    const earlyTasks = doneTasks.filter((t: any) => t.completedAt && t.dueDate && new Date(t.completedAt) < new Date(t.dueDate));

    const { data: earnedBadges } = await supabase.from('badges').select('type').eq('userId', userId);
    const earnedSet = new Set((earnedBadges || []).map((b: any) => b.type));

    const checkCondition = (type: string, condition: boolean) => (condition && !earnedSet.has(type) ? type : null);

    const newTypes = [
      checkCondition('streak_7', user.streak >= 7),
      checkCondition('streak_30', user.streak >= 30),
      checkCondition('tasks_10', doneTasks.length >= 10),
      checkCondition('tasks_50', doneTasks.length >= 50),
      checkCondition('early_bird', earlyTasks.length >= 5),
      checkCondition('xp_100', user.xp >= 100),
      checkCondition('xp_500', user.xp >= 500)
    ].filter(Boolean) as string[];

    if (newTypes.length > 0) {
      const inserts = newTypes.map(type => ({ userId, type }));
      await supabase.from('badges').insert(inserts);
    }

    return NextResponse.json({ newBadges: newTypes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
