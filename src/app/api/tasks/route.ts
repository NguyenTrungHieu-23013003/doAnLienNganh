import { NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';
import { Task } from '@/shared/types';

// GET /api/tasks — list tasks, filtered by userId or coachId
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const coachId = searchParams.get('coachId');
  const status = searchParams.get('status');

  let query = supabase.from('tasks').select('*').order('createdAt', { ascending: false });
  if (userId) query = query.eq('userId', userId);
  if (coachId) query = query.eq('coachId', coachId);
  if (status) query = query.eq('status', status);

  // Hide archived tasks
  query = query.or('isArchived.eq.false,isArchived.is.null');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/tasks — create a task (Coach only)
export async function POST(request: Request) {
  const body = await request.json();
  const { userId, coachId, title, type, description, dueDate } = body;

  if (!userId || !coachId || !title || !type || !dueDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const newTask: Partial<Task> = {
    userId,
    coachId,
    title,
    type,
    status: 'todo',
    description: description || '',
    dueDate,
  };

  const { data: created, error } = await supabase.from('tasks').insert(newTask).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Thông báo User nhận bài tập mới
  await supabase.from('notifications').insert({
    userId: newTask.userId!,
    title: 'Bài tập mới',
    message: `Coach vừa giao cho bạn một bài tập mới: ${newTask.title}`,
    isRead: false,
  });

  return NextResponse.json(created, { status: 201 });
}
