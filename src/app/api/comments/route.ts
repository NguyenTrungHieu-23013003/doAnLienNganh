import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/comments?taskId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  let query = supabase.from('comments').select('*').order('createdAt', { ascending: true });
  if (taskId) query = query.eq('taskId', taskId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/comments
export async function POST(request: Request) {
  const body = await request.json();
  const { taskId, authorId, content } = body;

  if (!taskId || !authorId || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const newComment = {
    taskId,
    authorId,
    content,
  };

  const { data: created, error } = await supabase.from('comments').insert(newComment).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json(created, { status: 201 });
}
