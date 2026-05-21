import { NextResponse } from 'next/server';
import { readDb } from '@/lib/mockDb';
import { User } from '@/shared/types';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const users = await readDb<User>('users');
    
    const user = users.find((u) => u.email === email);
    
    if (user) {
      return NextResponse.json(user);
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
