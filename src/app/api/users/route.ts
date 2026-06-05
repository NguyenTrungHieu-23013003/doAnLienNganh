import { NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';
import bcrypt from 'bcrypt';

// GET /api/users — list all users (optionally filtered by role)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const coachId = searchParams.get('coachId');

  let query = supabase.from('users').select('*').order('createdAt', { ascending: false });
  if (role) query = query.eq('role', role);
  if (coachId) query = query.eq('coachId', coachId).eq('role', 'user');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/users — create a new user
export async function POST(request: Request) {
  const body = await request.json();
  const { fullName, email, role, coachId } = body;

  if (!fullName || !email || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
  }

  // Cấp mật khẩu mặc định là 123456
  const hashedPassword = await bcrypt.hash('123456', 10);

  const newUser = {
    fullName,
    email,
    password: hashedPassword,
    role,
    coachId: coachId || null,
    is_verified: true,
  };

  const { data: created, error } = await supabase.from('users').insert(newUser).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Thông báo tới Coach nếu Admin assign ngay khi tạo tài khoản
  if (created?.coachId) {
    await supabase.from('notifications').insert({
      userId: created.coachId,
      title: 'Học viên mới',
      message: `Admin đã phân công học viên ${created.fullName} cho bạn huấn luyện`,
      isRead: false,
    });
  }

  return NextResponse.json(created, { status: 201 });
}
