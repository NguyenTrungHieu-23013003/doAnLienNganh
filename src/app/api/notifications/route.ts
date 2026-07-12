import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

// GET /api/notifications?userId=xxx
export async function GET(request: Request) {
  // [SEC] Kiểm tra xác thực
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // [SEC] Luôn filter theo session user — không tin vào query param
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('userId', session.user.id)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[notifications GET]', error);
    return NextResponse.json({ error: 'Không thể tải thông báo' }, { status: 500 });
  }

  return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store' } });
}
