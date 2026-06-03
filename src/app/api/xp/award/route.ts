import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, action } = await req.json();
    if (!userId || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    let xpToAdd = 0;
    let streakAdd = 0;

    switch (action) {
      case 'complete': xpToAdd = 10; streakAdd = 1; break;
      case 'approve': xpToAdd = 15; break;
      case 'ontime': xpToAdd = 5; break;
      case 'metrics': xpToAdd = 5; break;
      case 'streak': xpToAdd = 50; break;
      default: return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('increment_xp', {
      user_id: userId,
      xp_amount: xpToAdd,
      streak_add: streakAdd
    });

    if (error) throw error;

    fetch(new URL('/api/badges/check', req.url), {
      method: 'POST',
      body: JSON.stringify({ userId })
    }).catch(e => console.error('Badge check failed:', e));

    return NextResponse.json({ success: true, ...data[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
