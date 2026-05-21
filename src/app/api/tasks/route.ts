import { NextResponse } from 'next/server';
import { readDb, addItem } from '@/lib/mockDb';
import { Task } from '@/shared/types';
import crypto from 'crypto';

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

  const newTask: Task = {
    id: `task-${crypto.randomUUID()}`,
    userId,
    coachId,
    title,
    type,
    status: 'todo',
    description: description || '',
    dueDate,
    createdAt: new Date().toISOString(),
  };

  await addItem('tasks', newTask);
  return NextResponse.json(newTask, { status: 201 });
}
