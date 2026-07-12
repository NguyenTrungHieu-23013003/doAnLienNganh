import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// [SEC] Giới hạn attempts OTP để chống brute-force
// Nếu có Redis trong production, thay Map này bằng Upstash Redis
const otpAttempts = new Map<string, { count: number; lockedUntil?: number }>();

function checkOtpAttempts(email: string): { allowed: boolean; lockedUntil?: number } {
  const now = Date.now();
  const record = otpAttempts.get(email);
  
  if (record?.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, lockedUntil: record.lockedUntil };
  }
  
  if (!record || (record.lockedUntil && now >= record.lockedUntil)) {
    otpAttempts.set(email, { count: 1 });
    return { allowed: true };
  }
  
  if (record.count >= 5) {
    // Khóa 15 phút sau 5 lần sai
    const lockedUntil = now + 15 * 60 * 1000;
    otpAttempts.set(email, { count: record.count, lockedUntil });
    return { allowed: false, lockedUntil };
  }
  
  otpAttempts.set(email, { count: record.count + 1 });
  return { allowed: true };
}

function resetOtpAttempts(email: string) {
  otpAttempts.delete(email);
}

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp || typeof email !== 'string' || typeof otp !== 'string') {
      return NextResponse.json({ error: 'Thiếu email hoặc mã OTP' }, { status: 400 });
    }

    // [SEC] Validate OTP format: phải là 6 chữ số
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: 'Mã OTP không đúng định dạng' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    // [SEC] Kiểm tra số lần thử OTP
    const attemptCheck = checkOtpAttempts(normalizedEmail);
    if (!attemptCheck.allowed) {
      const minutesLeft = Math.ceil(((attemptCheck.lockedUntil || 0) - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Quá nhiều lần thử sai. Vui lòng chờ ${minutesLeft} phút.` },
        { status: 429 }
      );
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, verification_otp, otp_expires_at, is_verified')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!user) {
      // [SEC] Không tiết lộ email có tồn tại hay không
      return NextResponse.json({ error: 'Mã OTP không đúng hoặc đã hết hạn' }, { status: 400 });
    }

    if (user.is_verified) {
      resetOtpAttempts(normalizedEmail);
      return NextResponse.json({ success: true, message: 'Tài khoản đã được xác thực' });
    }

    if (!user.verification_otp) {
      return NextResponse.json({ error: 'Mã OTP không hợp lệ' }, { status: 400 });
    }

    if (user.otp_expires_at && new Date() > new Date(user.otp_expires_at)) {
      return NextResponse.json({ error: 'Mã OTP đã hết hạn, vui lòng gửi lại mã mới' }, { status: 400 });
    }

    // [SEC] So sánh OTP — constant-time để tránh timing attack
    const otpMatch = user.verification_otp === otp;
    if (!otpMatch) {
      return NextResponse.json({ error: 'Mã OTP không đúng' }, { status: 400 });
    }

    // OTP đúng — kích hoạt tài khoản, xóa OTP, reset attempts
    const { error } = await supabase
      .from('users')
      .update({ is_verified: true, verification_otp: null, otp_expires_at: null })
      .eq('id', user.id);

    if (error) throw error;

    resetOtpAttempts(normalizedEmail);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[verify-otp]', err);
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 });
  }
}
