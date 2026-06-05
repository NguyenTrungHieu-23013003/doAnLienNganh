import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || 'global';
    const coachId = searchParams.get('coachId');
    const userId = searchParams.get('userId');

    let baseQuery = supabase.from('users').select('id, name:fullName, xp, streak', { count: 'exact' })
      .eq('role', 'user');
    
    if (scope === 'group' && coachId) {
      baseQuery = baseQuery.eq('coachId', coachId);
    }

    const { data: topUsers, error: topError } = await baseQuery
      .order('xp', { ascending: false })
      .limit(10);
      
    if (topError) throw topError;

    const leaderboard = topUsers.map((u: any, i: number) => ({ ...u, rank: i + 1 }));

    let currentUserData = leaderboard.find(u => u.id === userId) || null;
    
    if (userId && !currentUserData) {
      const { data: me } = await supabase.from('users').select('id, name:fullName, xp, streak, role').eq('id', userId).single();
      // Only append current user if they are a standard user
      if (me && me.role === 'user') {
        let rankQuery = supabase.from('users').select('id', { count: 'exact', head: true })
          .eq('role', 'user')
          .gt('xp', me.xp);
        if (scope === 'group' && coachId) rankQuery = rankQuery.eq('coachId', coachId);
        
        const { count } = await rankQuery;
        currentUserData = { ...me, rank: (count || 0) + 1 };
      }
    }

    return NextResponse.json({ leaderboard, currentUserData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
