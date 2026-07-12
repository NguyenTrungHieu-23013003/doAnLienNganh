import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { Task } from '@/shared/types';
import { awardXp } from '@/lib/xp';

// Danh sách status hợp lệ
const VALID_STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked'] as const;
type TaskStatus = typeof VALID_STATUSES[number];

// GET /api/tasks/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // [SEC] Kiểm tra xác thực
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { data: task, error } = await supabase.from('tasks').select('*').eq('id', id).single();
  if (error || !task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // [SEC] Kiểm tra quyền: user chỉ xem task của mình; coach chỉ xem task mình giao
  if (session.user.role === 'user' && task.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (session.user.role === 'coach' && task.coachId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(task, { headers: { 'Cache-Control': 'no-store' } });
}

// PATCH /api/tasks/[id] — update status or fields
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // [SEC] Kiểm tra xác thực
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { data: oldTask } = await supabase.from('tasks').select('*').eq('id', id).single();
  if (!oldTask) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // [SEC] Kiểm tra quyền: chỉ được sửa task mình liên quan
  if (session.user.role === 'user' && oldTask.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (session.user.role === 'coach' && oldTask.coachId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  // [SEC] Whitelist fields được phép update theo role
  const userAllowed = ['status', 'dueDate', 'note'] as const;
  const coachAllowed = ['status', 'dueDate', 'title', 'description', 'type', 'note'] as const;
  const adminAllowed = [...coachAllowed, 'isArchived', 'userId', 'coachId'] as const;

  const allowedFields =
    session.user.role === 'admin'
      ? adminAllowed
      : session.user.role === 'coach'
        ? coachAllowed
        : userAllowed;

  const updates: Partial<Task> = {};
  for (const field of allowedFields) {
    if (field in body) {
      (updates as Record<string, unknown>)[field] = body[field];
    }
  }

  // [SEC] Validate status enum
  if ('status' in updates) {
    if (!VALID_STATUSES.includes(updates.status as TaskStatus)) {
      return NextResponse.json({ error: 'Status không hợp lệ' }, { status: 400 });
    }
  }

  // Auto-set completedAt when status changes to 'done'
  if (body.status === 'done' && !body.completedAt) {
    updates.completedAt = new Date().toISOString();
  }

  const { data: updated, error: updateError } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('[tasks PATCH]', updateError);
    return NextResponse.json({ error: 'Không thể cập nhật bài tập' }, { status: 500 });
  }

  if (body.status && oldTask && oldTask.status !== body.status) {
    if (body.status === 'todo') {
      await supabase.from('notifications').insert({
        userId: updated!.userId, title: 'Bài tập mới', message: `Bạn có một bài tập mới / được giao lại: ${updated!.title}`, isRead: false,
      });
    } else if (body.status === 'done' && oldTask.status === 'review') {
      await supabase.from('notifications').insert({
        userId: updated!.userId, title: 'Đã duyệt bài', message: `Bài tập "${updated!.title}" đã được duyệt hoàn thành`, isRead: false,
      });
    } else if (body.status === 'in_progress' && oldTask.status === 'review') {
      await supabase.from('notifications').insert({
        userId: updated!.userId, title: 'Trả lại bài', message: `Bài tập "${updated!.title}" chưa đạt, bị trả lại để tập thêm`, isRead: false,
      });
    } else if (body.status === 'review' && updated!.coachId) {
      await supabase.from('notifications').insert({
        userId: updated!.coachId, title: 'Học viên nộp bài', message: `Học viên đã nộp báo cáo bài tập "${updated!.title}"`, isRead: false,
      });
    } else if (body.status === 'blocked' && updated!.coachId) {
      await supabase.from('notifications').insert({
        userId: updated!.coachId, title: 'Báo cáo chấn thương', message: `Học viên bị chấn thương / gặp vấn đề ở bài tập "${updated!.title}"`, isRead: false,
      });
    }

    // Award XP: coach approves = 'approve', student marks done = 'complete'
    if (body.status === 'done' && oldTask.status === 'review') {
      try {
        await awardXp(updated!.userId, 'approve');
      } catch (err) { console.error('Award XP error:', err); }
    } else if (body.status === 'done') {
      try {
        await awardXp(updated!.userId, 'complete');
        if (updated!.dueDate && updated!.completedAt && new Date(updated!.completedAt) <= new Date(updated!.dueDate)) {
          await awardXp(updated!.userId, 'ontime');
        }
      } catch (err) { console.error('Award XP error:', err); }
    }
  }

  return NextResponse.json(updated);
}

// DELETE /api/tasks/[id] — soft delete (archive)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // [SEC] Kiểm tra xác thực + chỉ coach/admin được xóa task
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role === 'user') {
    return NextResponse.json({ error: 'Forbidden: chỉ coach được xóa bài tập' }, { status: 403 });
  }

  const { id } = await params;

  // Kiểm tra task có thuộc về coach này không
  if (session.user.role === 'coach') {
    const { data: task } = await supabase.from('tasks').select('coachId').eq('id', id).single();
    if (!task || task.coachId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { error } = await supabase.from('tasks').update({ isArchived: true }).eq('id', id);
  if (error) {
    console.error('[tasks DELETE]', error);
    return NextResponse.json({ error: 'Không thể xóa bài tập' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
