import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { Task } from '@/shared/types';

// GET /api/tasks — list tasks, filtered by userId or coachId
export async function GET(request: Request) {
  // [SEC] Kiểm tra xác thực
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabase.from('tasks').select('*').order('createdAt', { ascending: false });

  // [SEC] Luôn filter theo đúng role từ session, không tin params
  if (session.user.role === 'user') {
    // User chỉ xem tasks của chính mình
    query = query.eq('userId', session.user.id);
  } else if (session.user.role === 'coach') {
    // Coach xem tasks mình đã giao
    query = query.eq('coachId', session.user.id);
  } else if (session.user.role === 'admin') {
    // Admin có thể filter tùy ý
    const userId = searchParams.get('userId');
    const coachId = searchParams.get('coachId');
    if (userId) query = query.eq('userId', userId);
    if (coachId) query = query.eq('coachId', coachId);
  }

  if (status) query = query.eq('status', status);

  // Hide archived tasks
  query = query.or('isArchived.eq.false,isArchived.is.null');

  const { data, error } = await query;
  if (error) {
    console.error('[tasks GET]', error);
    return NextResponse.json({ error: 'Không thể tải danh sách bài tập' }, { status: 500 });
  }

  return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/tasks — create a task (Coach only)
export async function POST(request: Request) {
  // [SEC] Chỉ coach và admin được tạo task
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role === 'user') {
    return NextResponse.json({ error: 'Forbidden: chỉ coach được giao bài tập' }, { status: 403 });
  }

  const body = await request.json();
  const { userId, title, type, description, frequency = 1 } = body;

  if (!userId || !title || !type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // [SEC] coachId luôn lấy từ session
  const coachId = session.user.id;

  // Cap frequency at 30 to prevent DoS/database overflow
  const safeFreq = Math.min(Math.max(1, parseInt(frequency as string) || 1), 30);

  const tasksToCreate = Array.from({ length: safeFreq }).map(() => ({
    userId,
    coachId,
    title,
    type,
    status: 'todo',
    description: description || '',
    dueDate: null,
  }));

  const { data: createdTasks, error } = await supabase.from('tasks').insert(tasksToCreate).select();
  if (error) {
    console.error('[tasks POST]', error);
    return NextResponse.json({ error: 'Không thể tạo bài tập' }, { status: 500 });
  }

  // Thông báo User nhận bài tập mới
  await supabase.from('notifications').insert({
    userId: userId,
    title: 'Bài tập mới',
    message: `Coach vừa giao cho bạn ${safeFreq} bài tập: ${title}. Hãy chọn ngày tập!`,
    isRead: false,
  });

  return NextResponse.json(createdTasks, { status: 201 });
}
