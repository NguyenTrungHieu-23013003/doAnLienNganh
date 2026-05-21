import { NextResponse } from 'next/server';
import { getItem, updateItem, deleteItem } from '@/lib/mockDb';
import { User } from '@/shared/types';

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
  await updateItem<User>('users', id, body);
  const updated = await getItem<User>('users', id);
  return NextResponse.json(updated);
}

// DELETE /api/users/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteItem('users', id);
  return NextResponse.json({ success: true });
}
