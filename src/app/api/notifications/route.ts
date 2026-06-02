import { NextResponse } from 'next/server';
import { readDb } from '@/lib/mockDb';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  let notifications = await readDb<Notification>('notifications');
  
  if (userId) {
    notifications = notifications.filter((n) => n.userId === userId);
  }
  
  // Sắp xếp mới nhất lên đầu
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(notifications, { headers: { 'Cache-Control': 'no-store' } });
}
