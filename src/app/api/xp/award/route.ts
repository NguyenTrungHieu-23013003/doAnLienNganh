import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { userId, action } = await req.json();
    if (!userId || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    let xpToAdd = 0;
    let streakAdd = 0;

    switch (action) {
      case 'complete': xpToAdd = 2; streakAdd = 1; break;
      case 'approve': xpToAdd = 2; break;
      case 'ontime': xpToAdd = 1; break;
      case 'metrics': xpToAdd = 1; break;
      case 'streak': xpToAdd = 10; break;
      default: return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Lấy xp và streak hiện tại
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('xp, streak')
      .eq('id', userId)
      .single();

    if (fetchError || !user) throw fetchError || new Error('User not found');

    const newXp = (user.xp || 0) + xpToAdd;
    const newStreak = (user.streak || 0) + streakAdd;

    // Cập nhật trực tiếp không dùng RPC
    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update({ xp: newXp, streak: newStreak, last_active: new Date().toISOString() })
      .eq('id', userId)
      .select('xp, streak')
      .single();

    if (updateError) throw updateError;

    // Kích hoạt kiểm tra badge
    fetch(new URL('/api/badges/check', req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    }).catch(e => console.error('Badge check failed:', e));

    return NextResponse.json({ success: true, xp: updated?.xp, streak: updated?.streak });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
