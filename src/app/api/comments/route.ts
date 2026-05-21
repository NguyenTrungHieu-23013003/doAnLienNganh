import { NextResponse } from 'next/server';
import { readDb, addItem } from '@/lib/mockDb';
import { Comment } from '@/shared/types';
import crypto from 'crypto';

// GET /api/comments?taskId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  let comments = await readDb<Comment>('comments');
  if (taskId) comments = comments.filter((c) => c.taskId === taskId);
  comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return NextResponse.json(comments, { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/comments
export async function POST(request: Request) {
  const body = await request.json();
  const { taskId, authorId, content } = body;

  if (!taskId || !authorId || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const newComment: Comment = {
    id: `comment-${crypto.randomUUID()}`,
    taskId,
    authorId,
    content,
    createdAt: new Date().toISOString(),
  };

  await addItem('comments', newComment);
  return NextResponse.json(newComment, { status: 201 });
}
