import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { awardXp } from '@/lib/xp';

// GET /api/metrics?userId=xxx
export async function GET(request: Request) {
  // [SEC] Kiểm tra xác thực
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedUserId = searchParams.get('userId');

  // [SEC] Authorization: user chỉ xem metrics của chính mình
  // Coach/Admin có thể xem metrics của học viên
  const targetUserId = requestedUserId || session.user.id;
  if (session.user.role === 'user' && targetUserId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('metrics')
    .select('*')
    .eq('userId', targetUserId)
    .order('recordedAt', { ascending: false });

  if (error) {
    console.error('[metrics GET]', error);
    return NextResponse.json({ error: 'Không thể tải dữ liệu chỉ số sức khỏe' }, { status: 500 });
  }

  return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/metrics
export async function POST(request: Request) {
  // [SEC] Kiểm tra xác thực
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { weight, height, bodyFatPercentage } = body;

  // [SEC] userId luôn lấy từ session, không tin vào body
  const userId = session.user.id;

  if (weight == null || height == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const parsedWeight = parseFloat(weight);
  const parsedHeight = parseFloat(height);
  const parsedBodyFat = parseFloat(bodyFatPercentage);

  if (isNaN(parsedWeight) || parsedWeight <= 0 || parsedWeight > 500) {
    return NextResponse.json({ error: 'Cân nặng phải là số dương hợp lệ (1-500 kg)' }, { status: 400 });
  }
  if (isNaN(parsedHeight) || parsedHeight <= 0 || parsedHeight > 300) {
    return NextResponse.json({ error: 'Chiều cao phải là số dương hợp lệ (1-300 cm)' }, { status: 400 });
  }

  const newMetric = {
    userId,
    weight: parsedWeight,
    height: parsedHeight,
    bodyFatPercentage: isNaN(parsedBodyFat) ? 0 : Math.min(Math.max(parsedBodyFat, 0), 100),
  };

  const { data: created, error } = await supabase.from('metrics').insert(newMetric).select().single();
  if (error) {
    console.error('[metrics POST]', error);
    return NextResponse.json({ error: 'Không thể lưu chỉ số sức khỏe' }, { status: 500 });
  }

  try {
    await awardXp(userId, 'metrics');
  } catch (e) {
    console.error('Award XP failed:', e);
  }

  return NextResponse.json(created, { status: 201 });
}
