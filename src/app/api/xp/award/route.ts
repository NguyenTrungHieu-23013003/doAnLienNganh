import { NextResponse } from 'next/server';
import { awardXp } from '@/lib/xp';

export async function POST(req: Request) {
  try {
    const { userId, action } = await req.json();
    if (!userId || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const updated = await awardXp(userId, action);

    return NextResponse.json({ success: true, xp: updated?.xp, streak: updated?.streak });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
