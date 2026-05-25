import { NextResponse } from 'next/server';
import { readDb } from '@/lib/mockDb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  let notifications = await readDb<any>('notifications');
  
  if (userId) {
    notifications = notifications.filter((n: any) => n.userId === userId);
  }
  
  // Sắp xếp mới nhất lên đầu
  notifications.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(notifications, { headers: { 'Cache-Control': 'no-store' } });
}
