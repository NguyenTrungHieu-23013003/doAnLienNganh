import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin' }, { status: 400 });
    }

    // [SEC] Validate độ dài cơ bản để tránh abuse
    if (typeof email !== 'string' || email.length > 254 || !email.includes('@')) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Mật khẩu phải từ 8 đến 128 ký tự' }, { status: 400 });
    }
    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
      return NextResponse.json({ error: 'Tên phải từ 2 đến 100 ký tự' }, { status: 400 });
    }

    const { data: existing } = await supabase.from('users').select('id, is_verified').eq('email', email.toLowerCase()).maybeSingle();
    if (existing && existing.is_verified) {
      return NextResponse.json({ error: 'Email đã được sử dụng!' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12); // Tăng cost factor lên 12

    // [SEC] Dùng crypto.randomInt thay vì Math.random (CSPRNG)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    if (existing && !existing.is_verified) {
      const { error: updateError } = await supabase.from('users').update({
        fullName: name.trim(),
        password: hashedPassword,
        verification_otp: otp,
        otp_expires_at: otpExpiresAt,
      }).eq('email', email.toLowerCase());

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from('users').insert({
        fullName: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'user',
        is_verified: false,
        verification_otp: otp,
        otp_expires_at: otpExpiresAt,
      });

      if (insertError) throw insertError;
    }

    // Gửi email chứa OTP qua Resend
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'FitnessTracker <onboarding@resend.dev>',
        to: email.toLowerCase(),
        subject: 'FitnessTracker - Mã OTP Xác Thực',
        html: `<h1>Xin chào ${name.trim()}!</h1><p>Mã xác thực OTP của bạn là: <strong>${otp}</strong></p><p>Mã có hiệu lực trong 2 phút. Vui lòng nhập mã này trên web để kích hoạt tài khoản.</p>`
      });
    }

    return NextResponse.json({ success: true, email: email.toLowerCase() });
  } catch (err: unknown) {
    console.error('[register] Error:', err);
    // [SEC] Không leak error chi tiết ra ngoài
    return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 });
  }
}
