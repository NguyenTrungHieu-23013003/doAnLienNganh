import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

// PATCH /api/notifications/[id] — đánh dấu đã đọc
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // [SEC] Kiểm tra xác thực
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // [SEC] Kiểm tra notification có thuộc về user này không (chống IDOR)
  const { data: notification } = await supabase
    .from('notifications')
    .select('userId')
    .eq('id', id)
    .single();

  if (!notification) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (notification.userId !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('notifications')
    .update({ isRead: true })
    .eq('id', id);

  if (error) {
    console.error('[notifications PATCH]', error);
    return NextResponse.json({ error: 'Không thể cập nhật thông báo' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
