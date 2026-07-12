import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// GET /api/users — list all users (optionally filtered by role)
// [SEC] Chỉ admin và coach được list users
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role === 'user') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const coachId = searchParams.get('coachId');

  // [SEC] Coach chỉ được xem học viên của mình, không xem toàn bộ
  if (session.user.role === 'coach') {
    const { data, error } = await supabase
      .from('users')
      .select('id, fullName, email, role, coachId, xp, streak, createdAt')
      .eq('coachId', session.user.id)
      .eq('role', 'user')
      .order('createdAt', { ascending: false });
    if (error) {
      console.error('[users GET coach]', error);
      return NextResponse.json({ error: 'Không thể tải danh sách học viên' }, { status: 500 });
    }
    return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store' } });
  }

  // Admin xem tất cả
  let query = supabase
    .from('users')
    .select('id, fullName, email, role, coachId, xp, streak, createdAt')
    .order('createdAt', { ascending: false });
  if (role) query = query.eq('role', role);
  if (coachId) query = query.eq('coachId', coachId).eq('role', 'user');

  const { data, error } = await query;
  if (error) {
    console.error('[users GET admin]', error);
    return NextResponse.json({ error: 'Không thể tải danh sách người dùng' }, { status: 500 });
  }

  return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/users — create a new user (admin only)
export async function POST(request: Request) {
  // [SEC] Chỉ admin được tạo user
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: chỉ admin được tạo tài khoản' }, { status: 403 });
  }

  const body = await request.json();
  const { fullName, email, role, coachId } = body;

  if (!fullName || !email || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // [SEC] Chỉ cho phép tạo role hợp lệ, không phải admin
  const ALLOWED_ROLES = ['user', 'coach'];
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Role không hợp lệ' }, { status: 400 });
  }

  const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
  }

  // [SEC] Tạo mật khẩu ngẫu nhiên thay vì "123456"
  const tempPassword = crypto.randomBytes(12).toString('base64url');
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  const newUser = {
    fullName,
    email,
    password: hashedPassword,
    role,
    coachId: coachId || null,
    is_verified: true,
  };

  const { data: created, error } = await supabase
    .from('users')
    .insert(newUser)
    .select('id, fullName, email, role, coachId, xp, streak, createdAt')
    .single();

  if (error) {
    console.error('[users POST]', error);
    return NextResponse.json({ error: 'Không thể tạo tài khoản' }, { status: 500 });
  }

  // Thông báo tới Coach nếu Admin assign ngay khi tạo tài khoản
  if (created?.coachId) {
    await supabase.from('notifications').insert({
      userId: created.coachId,
      title: 'Học viên mới',
      message: `Admin đã phân công học viên ${created.fullName} cho bạn huấn luyện`,
      isRead: false,
    });
  }

  // [SEC] Trả về mật khẩu tạm thời 1 lần (admin cần gửi cho user)
  // Trong production nên gửi qua email thay vì response body
  return NextResponse.json({ ...created, tempPassword }, { status: 201 });
}
