import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

// GET /api/comments?taskId=xxx
export async function GET(request: Request) {
  // [SEC] Kiểm tra xác thực
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ error: 'taskId là bắt buộc' }, { status: 400 });
  }

  // [SEC] Kiểm tra quyền xem task này
  if (session.user.role === 'user') {
    const { data: task } = await supabase.from('tasks').select('userId').eq('id', taskId).single();
    if (!task || task.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else if (session.user.role === 'coach') {
    const { data: task } = await supabase.from('tasks').select('coachId').eq('id', taskId).single();
    if (!task || task.coachId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('taskId', taskId)
    .order('createdAt', { ascending: true });

  if (error) {
    console.error('[comments GET]', error);
    return NextResponse.json({ error: 'Không thể tải bình luận' }, { status: 500 });
  }

  return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/comments
export async function POST(request: Request) {
  // [SEC] Kiểm tra xác thực
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { taskId, content } = body;

  if (!taskId || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // [SEC] Giới hạn độ dài comment
  if (typeof content !== 'string' || content.trim().length === 0 || content.length > 2000) {
    return NextResponse.json({ error: 'Nội dung bình luận không hợp lệ (tối đa 2000 ký tự)' }, { status: 400 });
  }

  // [SEC] Kiểm tra quyền comment trên task này
  const { data: task } = await supabase.from('tasks').select('userId, coachId').eq('id', taskId).single();
  if (!task) return NextResponse.json({ error: 'Task không tồn tại' }, { status: 404 });

  const canComment =
    session.user.role === 'admin' ||
    task.userId === session.user.id ||
    task.coachId === session.user.id;

  if (!canComment) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // [SEC] authorId luôn lấy từ session, không tin vào body
  const newComment = {
    taskId,
    authorId: session.user.id,
    content: content.trim(),
  };

  const { data: created, error } = await supabase.from('comments').insert(newComment).select().single();
  if (error) {
    console.error('[comments POST]', error);
    return NextResponse.json({ error: 'Không thể lưu bình luận' }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}
