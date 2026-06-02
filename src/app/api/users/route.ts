import { NextResponse } from 'next/server';
import { readDb, addItem } from '@/lib/mockDb';
import { User } from '@/shared/types';

// GET /api/users — list all users (optionally filtered by role)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const coachId = searchParams.get('coachId');

  let users = await readDb<User>('users');
  if (role) users = users.filter((u) => u.role === role);
  if (coachId) users = users.filter((u) => u.coachId === coachId);

  return NextResponse.json(users, { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/users — create a new user
export async function POST(request: Request) {
  const body = await request.json();
  const { fullName, email, role, coachId } = body;

  if (!fullName || !email || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const existing = await readDb<User>('users');
  if (existing.find((u) => u.email === email)) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
  }

  const newUser = {
    fullName,
    email,
    role,
    coachId: coachId || undefined,
  };

  const created = await addItem<Omit<User, 'id' | 'createdAt'>>('users', newUser);
  const resultUser = created ?? { ...newUser, id: '', createdAt: '' };

  // Thông báo tới Coach nếu Admin assign ngay khi tạo tài khoản
  if (resultUser.coachId) {
    await addItem('notifications', {
      userId: resultUser.coachId,
      title: 'Học viên mới',
      message: `Admin đã phân công học viên ${resultUser.fullName} cho bạn huấn luyện`,
      isRead: false,
    });
  }

  return NextResponse.json(resultUser, { status: 201 });
}
