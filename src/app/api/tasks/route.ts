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
  const { userId, coachId, title, type, description, frequency = 1 } = body;

  if (!userId || !coachId || !title || !type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Create multiple tasks based on frequency
  const tasksToCreate = Array.from({ length: Math.max(1, frequency) }).map(() => ({
    userId,
    coachId,
    title,
    type,
    status: 'todo',
    description: description || '',
    dueDate: null, // User picks the date later
  }));

  const { data: createdTasks, error } = await supabase.from('tasks').insert(tasksToCreate).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Thông báo User nhận bài tập mới
  await supabase.from('notifications').insert({
    userId: userId,
    title: 'Bài tập mới',
    message: `Coach vừa giao cho bạn ${frequency} bài tập: ${title}. Hãy chọn ngày tập!`,
    isRead: false,
  });

  return NextResponse.json(createdTasks, { status: 201 });
}
