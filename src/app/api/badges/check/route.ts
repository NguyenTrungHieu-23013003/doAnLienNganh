import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkAndAwardBadges } from '@/lib/badges';

export async function GET(req: Request) {
  // [SEC] Kiểm tra xác thực
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId');

    // [SEC] User chỉ check badge của chính mình; coach/admin có thể check cho người khác
    const targetUserId =
      session.user.role === 'user' ? session.user.id : (requestedUserId || session.user.id);

    if (session.user.role === 'user' && requestedUserId && requestedUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await checkAndAwardBadges(targetUserId);
    return NextResponse.json({ user: result.user, tasks: result.tasks, badges: result.badges });
  } catch (err: unknown) {
    console.error('[badges check GET]', err);
    return NextResponse.json({ error: 'Không thể kiểm tra huy hiệu' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // [SEC] Kiểm tra xác thực
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId: requestedUserId } = await req.json();

    // [SEC] User chỉ award badge cho chính mình
    const targetUserId =
      session.user.role === 'user' ? session.user.id : (requestedUserId || session.user.id);

    if (session.user.role === 'user' && requestedUserId && requestedUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!targetUserId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const result = await checkAndAwardBadges(targetUserId);
    return NextResponse.json({ newBadges: result.newBadges });
  } catch (err: unknown) {
    console.error('[badges check POST]', err);
    return NextResponse.json({ error: 'Không thể kiểm tra huy hiệu' }, { status: 500 });
  }
}
