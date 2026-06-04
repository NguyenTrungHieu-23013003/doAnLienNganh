import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/notifications?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  let query = supabase.from('notifications').select('*').order('createdAt', { ascending: false });
  
  if (userId) {
    query = query.eq('userId', userId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store' } });
}
