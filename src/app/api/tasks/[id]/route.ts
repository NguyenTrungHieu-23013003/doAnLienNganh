import { NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';
import { Task } from '@/shared/types';
import { awardXp } from '@/lib/xp';

// GET /api/tasks/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: task, error } = await supabase.from('tasks').select('*').eq('id', id).single();
  if (error || !task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(task, { headers: { 'Cache-Control': 'no-store' } });
}

// PATCH /api/tasks/[id] — update status or fields
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const { data: oldTask } = await supabase.from('tasks').select('*').eq('id', id).single();
  const updates: Partial<Task> = { ...body };

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

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

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
        // Check if ontime
        if (updated!.dueDate && updated!.completedAt && new Date(updated!.completedAt) <= new Date(updated!.dueDate)) {
          await awardXp(updated!.userId, 'ontime');
        }
      } catch (err) { console.error('Award XP error:', err); }
    }
  }

  return NextResponse.json(updated);
}

// DELETE /api/tasks/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
