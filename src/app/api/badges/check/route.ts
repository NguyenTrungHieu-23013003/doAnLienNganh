import { NextResponse } from 'next/server';
import { checkAndAwardBadges } from '@/lib/badges';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const result = await checkAndAwardBadges(userId);
    return NextResponse.json({ user: result.user, tasks: result.tasks, badges: result.badges });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const result = await checkAndAwardBadges(userId);
    return NextResponse.json({ newBadges: result.newBadges });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
