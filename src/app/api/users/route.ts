import { NextResponse } from 'next/server';
import { readDb, addItem, updateItem, deleteItem } from '@/lib/mockDb';
import { User } from '@/shared/types';
import crypto from 'crypto';

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

  const newUser: User = {
    id: `user-${crypto.randomUUID()}`,
    fullName,
    email,
    role,
    coachId: coachId || undefined,
    createdAt: new Date().toISOString(),
  };

  await addItem('users', newUser);
  return NextResponse.json(newUser, { status: 201 });
}
