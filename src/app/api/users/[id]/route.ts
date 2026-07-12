import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

// [SEC] Danh sách field được phép update theo role
const ALLOWED_FIELDS_USER = ['coachId'] as const;
const ALLOWED_FIELDS_ADMIN = ['fullName', 'email', 'coachId', 'role'] as const;

// GET /api/users/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // [SEC] Kiểm tra xác thực
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // [SEC] User chỉ xem được profile của chính mình; coach/admin xem được tất cả
  if (session.user.role === 'user' && session.user.id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // [SEC] Không dùng select('*') — loại bỏ password hash, OTP, service fields
  const { data: user, error } = await supabase
    .from('users')
    .select('id, fullName, email, role, coachId, xp, streak, createdAt, is_verified')
    .eq('id', id)
    .single();

  if (error || !user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user, { headers: { 'Cache-Control': 'no-store' } });
}

// PATCH /api/users/[id]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // [SEC] Kiểm tra xác thực
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // [SEC] Kiểm tra authorization: chỉ admin hoặc chính user đó mới được sửa
  if (session.user.role !== 'admin' && session.user.id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  // [SEC] Whitelist fields — chặn mass assignment (không cho set password, role tùy ý)
  const allowedFields = session.user.role === 'admin' ? ALLOWED_FIELDS_ADMIN : ALLOWED_FIELDS_USER;
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Không có trường hợp lệ để cập nhật' }, { status: 400 });
  }

  if (updateData.coachId === '') updateData.coachId = null;

  const { data: oldUser } = await supabase
    .from('users')
    .select('coachId, fullName')
    .eq('id', id)
    .single();

  const { data: updated, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select('id, fullName, email, role, coachId, xp, streak, createdAt, is_verified')
    .single();

  if (error) {
    console.error('[users PATCH]', error);
    return NextResponse.json({ error: 'Không thể cập nhật thông tin người dùng' }, { status: 500 });
  }

  // Nếu coachId thay đổi → gửi thông báo
  if (oldUser && 'coachId' in updateData) {
    const oldCoachId = oldUser.coachId;
    const newCoachId = updated?.coachId;
    const studentName = updated?.fullName || oldUser.fullName;

    // Thông báo cho coach MỚI khi được học viên chọn
    if (newCoachId && oldCoachId !== newCoachId) {
      await supabase.from('notifications').insert({
        userId: newCoachId,
        title: 'Học viên mới chọn bạn',
        message: `Học viên ${studentName} đã chọn bạn làm huấn luyện viên của họ`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    // Thông báo cho coach CŨ khi học viên rời đi
    if (oldCoachId && oldCoachId !== newCoachId) {
      await supabase.from('notifications').insert({
        userId: oldCoachId,
        title: 'Học viên đã rời nhóm',
        message: `Học viên ${studentName} đã chuyển sang huấn luyện viên khác`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json(updated);
}

// DELETE /api/users/[id] — chỉ admin
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // [SEC] Kiểm tra xác thực + chỉ admin được xóa user
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: chỉ admin được xóa tài khoản' }, { status: 403 });
  }

  const { id } = await params;

  // [SEC] Không cho phép admin tự xóa chính mình
  if (session.user.id === id) {
    return NextResponse.json({ error: 'Không thể tự xóa tài khoản của chính mình' }, { status: 400 });
  }

  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) {
    console.error('[users DELETE]', error);
    return NextResponse.json({ error: 'Không thể xóa tài khoản' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
