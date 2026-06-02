import { NextResponse } from 'next/server';
import { readDb, addItem } from '@/lib/mockDb';
import { Task } from '@/shared/types';

// GET /api/tasks — list tasks, filtered by userId or coachId
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const coachId = searchParams.get('coachId');
  const status = searchParams.get('status');

  let tasks = await readDb<Task>('tasks');
  if (userId) tasks = tasks.filter((t) => t.userId === userId);
  if (coachId) tasks = tasks.filter((t) => t.coachId === coachId);
  if (status) tasks = tasks.filter((t) => t.status === status);

  // Sort by createdAt descending
  tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(tasks, { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/tasks — create a task (Coach only)
export async function POST(request: Request) {
  const body = await request.json();
  const { userId, coachId, title, type, description, dueDate } = body;

  if (!userId || !coachId || !title || !type || !dueDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const newTask = {
    userId,
    coachId,
    title,
    type,
    status: 'todo',
    description: description || '',
    dueDate,
  };

  const createdTask = await addItem('tasks', newTask);
  
  // Thông báo User nhận bài tập mới
  await addItem('notifications', {
    userId: newTask.userId,
    title: 'Bài tập mới',
    message: `Coach vừa giao cho bạn một bài tập mới: ${newTask.title}`,
    isRead: false,
  });

  return NextResponse.json(createdTask ?? newTask, { status: 201 });
}
