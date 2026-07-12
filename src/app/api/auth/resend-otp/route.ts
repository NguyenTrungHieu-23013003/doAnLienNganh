import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, fullName, is_verified')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (userError || !user) {
      // [SEC] Không tiết lộ email có tồn tại hay không để tránh user enumeration
      return NextResponse.json({ success: true, message: 'Nếu email hợp lệ, OTP sẽ được gửi.' });
    }

    if (user.is_verified) {
      return NextResponse.json({ error: 'Tài khoản đã được xác thực trước đó.' }, { status: 400 });
    }

    // [SEC] Dùng crypto.randomInt thay vì Math.random (CSPRNG)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('users')
      .update({ verification_otp: otp, otp_expires_at: otpExpiresAt })
      .eq('email', normalizedEmail);

    if (updateError) throw updateError;

    // Gửi email chứa OTP qua Resend
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      try {
        await resend.emails.send({
          from: 'FitnessTracker <onboarding@resend.dev>',
          to: normalizedEmail,
          subject: 'FitnessTracker - Mã OTP Xác Thực Mới',
          html: `<h1>Xin chào ${user.fullName}!</h1><p>Mã xác thực OTP mới của bạn là: <strong>${otp}</strong></p><p>Mã có hiệu lực trong 2 phút. Vui lòng nhập mã này trên web để kích hoạt tài khoản.</p>`
        });
      } catch (emailError: unknown) {
        console.error('Error sending resend OTP email:', emailError);
      }
    }

    return NextResponse.json({ success: true, message: 'Đã gửi lại OTP thành công.' });
  } catch (err: unknown) {
    console.error('[resend-otp]', err);
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 });
  }
}
