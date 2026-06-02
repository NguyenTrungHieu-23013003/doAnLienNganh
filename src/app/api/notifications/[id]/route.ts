import { NextResponse } from 'next/server';
import { updateItem } from '@/lib/mockDb';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Đánh dấu đã đọc
  await updateItem<{ id: string; isRead: boolean }>('notifications', id, { isRead: true });
  
  return NextResponse.json({ success: true });
}
