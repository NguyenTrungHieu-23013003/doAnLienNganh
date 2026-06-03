import { NextResponse } from 'next/server';
import { addItem } from '@/lib/mockDb';
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
  
  const { data: oldUser } = await supabase.from('users').select('coachId').eq('id', id).single();
  
  const updateData = { ...body };
  if (updateData.coachId === '') updateData.coachId = null;

  const { data: updated, error } = await supabase.from('users').update(updateData).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Nếu có sự thay đổi coachId (Admin gắn coach cho user)
  if (oldUser && updated && updated.coachId && oldUser.coachId !== updated.coachId) {
    await addItem('notifications', {
      id: `notif-${crypto.randomUUID()}`,
      userId: updated.coachId,
      title: 'Học viên mới',
      message: `Admin đã phân công học viên ${updated.fullName} cho bạn huấn luyện`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
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
