import { NextResponse } from 'next/server';
import { getItem, updateItem, deleteItem, addItem } from '@/lib/mockDb';
import { Task } from '@/shared/types';
import crypto from 'crypto';

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

  const oldTask = await getItem<Task>('tasks', id);
  const updates: Partial<Task> = { ...body };

  // Auto-set completedAt when status changes to 'done'
  if (body.status === 'done' && !body.completedAt) {
    updates.completedAt = new Date().toISOString();
  }

  await updateItem<Task>('tasks', id, updates);
  const updated = await getItem<Task>('tasks', id);

  if (body.status && oldTask && oldTask.status !== body.status) {
    if (body.status === 'todo') {
      // Coach reassign task
      await addItem('notifications', {
        id: `notif-${crypto.randomUUID()}`, userId: updated!.userId, title: 'Bài tập mới', message: `Bạn có một bài tập mới / được giao lại: ${updated!.title}`, isRead: false, createdAt: new Date().toISOString()
      });
    } else if (body.status === 'done' && oldTask.status === 'review') {
      // Coach approve task
      await addItem('notifications', {
        id: `notif-${crypto.randomUUID()}`, userId: updated!.userId, title: 'Đã duyệt bài', message: `Bài tập "${updated!.title}" đã được duyệt hoàn thành`, isRead: false, createdAt: new Date().toISOString()
      });
    } else if (body.status === 'in_progress' && oldTask.status === 'review') {
      // Coach return task
      await addItem('notifications', {
        id: `notif-${crypto.randomUUID()}`, userId: updated!.userId, title: 'Trả lại bài', message: `Bài tập "${updated!.title}" chưa đạt, bị trả lại để tập thêm`, isRead: false, createdAt: new Date().toISOString()
      });
    } else if (body.status === 'review' && updated!.coachId) {
      // User submit task
      await addItem('notifications', {
        id: `notif-${crypto.randomUUID()}`, userId: updated!.coachId, title: 'Học viên nộp bài', message: `Học viên đã nộp báo cáo bài tập "${updated!.title}"`, isRead: false, createdAt: new Date().toISOString()
      });
    } else if (body.status === 'blocked' && updated!.coachId) {
      // User report injury
      await addItem('notifications', {
        id: `notif-${crypto.randomUUID()}`, userId: updated!.coachId, title: 'Báo cáo chấn thương', message: `Học viên bị chấn thương / gặp vấn đề ở bài tập "${updated!.title}"`, isRead: false, createdAt: new Date().toISOString()
      });
    }
  }

  return NextResponse.json(updated);
}

// DELETE /api/tasks/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteItem('tasks', id);
  return NextResponse.json({ success: true });
}
