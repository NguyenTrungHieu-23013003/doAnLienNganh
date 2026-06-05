import { NextResponse } from 'next/server';

import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

// GET /api/users/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: user, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error || !user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user, { headers: { 'Cache-Control': 'no-store' } });
}

// PATCH /api/users/[id]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  
  const { data: oldUser } = await supabase.from('users').select('coachId, fullName').eq('id', id).single();
  
  const updateData = { ...body };
  if (updateData.coachId === '') updateData.coachId = null;

  const { data: updated, error } = await supabase.from('users').update(updateData).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Nếu coachId thay đổi → gửi thông báo
  if (oldUser && 'coachId' in updateData) {
    const oldCoachId = oldUser.coachId;
    const newCoachId = updated?.coachId;
    const studentName = updated?.fullName || oldUser.fullName;

    // Thông báo cho coach MỚI khi được học viên chọn
    if (newCoachId && oldCoachId !== newCoachId) {
      await supabase.from('notifications').insert({
        id: `notif-${crypto.randomUUID()}`,
        userId: newCoachId,
        title: 'Học viên mới chọn bạn',
        message: `Học viên ${studentName} đã chọn bạn làm huấn luyện viên của họ`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    // Thông báo cho coach CŨ khi học viên rời đi
    if (oldCoachId && oldCoachId !== newCoachId) {
      await supabase.from('notifications').insert({
        id: `notif-${crypto.randomUUID()}`,
        userId: oldCoachId,
        title: 'Học viên đã rời nhóm',
        message: `Học viên ${studentName} đã chuyển sang huấn luyện viên khác`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  return NextResponse.json(updated);
}

// DELETE /api/users/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
