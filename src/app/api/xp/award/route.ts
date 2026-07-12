import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { awardXp } from '@/lib/xp';

// [SEC] Endpoint này chỉ được gọi từ server-side (internal)
// Nếu cần gọi từ client phải có session hợp lệ
export async function POST(req: Request) {
  // [SEC] Kiểm tra xác thực
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId, action } = await req.json();
    if (!userId || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    // [SEC] User chỉ được award XP cho chính mình
    // Coach/Admin có thể award cho người khác
    if (session.user.role === 'user' && userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // [SEC] Whitelist các action hợp lệ để tránh injection
    const VALID_ACTIONS = ['complete', 'approve', 'ontime', 'metrics', 'streak', 'login'] as const;
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
    }

    const updated = await awardXp(userId, action);

    return NextResponse.json({ success: true, xp: updated?.xp, streak: updated?.streak });
  } catch (err: unknown) {
    console.error('[xp/award]', err);
    return NextResponse.json({ error: 'Không thể cập nhật XP' }, { status: 500 });
  }
}
