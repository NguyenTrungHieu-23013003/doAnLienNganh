import { NextResponse } from 'next/server';
import { getItem, updateItem, deleteItem, addItem } from '@/lib/mockDb';
import { User } from '@/shared/types';
import crypto from 'crypto';

// GET /api/users/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getItem<User>('users', id);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user, { headers: { 'Cache-Control': 'no-store' } });
}

// PATCH /api/users/[id]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  
  const oldUser = await getItem<User>('users', id);
  await updateItem<User>('users', id, body);
  const updated = await getItem<User>('users', id);

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
  await deleteItem('users', id);
  return NextResponse.json({ success: true });
}
