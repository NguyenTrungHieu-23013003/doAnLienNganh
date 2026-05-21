import { NextResponse } from 'next/server';
import { getItem, updateItem, deleteItem } from '@/lib/mockDb';
import { Task, TaskStatus } from '@/shared/types';

// GET /api/tasks/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getItem<Task>('tasks', id);
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(task, { headers: { 'Cache-Control': 'no-store' } });
}

// PATCH /api/tasks/[id] — update status or fields
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const updates: Partial<Task> = { ...body };

  // Auto-set completedAt when status changes to 'done'
  if (body.status === 'done' && !body.completedAt) {
    updates.completedAt = new Date().toISOString();
  }

  await updateItem<Task>('tasks', id, updates);
  const updated = await getItem<Task>('tasks', id);
  return NextResponse.json(updated);
}

// DELETE /api/tasks/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteItem('tasks', id);
  return NextResponse.json({ success: true });
}
