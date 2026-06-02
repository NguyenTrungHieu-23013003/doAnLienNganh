import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin' }, { status: 400 });
    }

    const { data: existing } = await supabase.from('users').select('id, is_verified').eq('email', email).maybeSingle();
    if (existing && existing.is_verified) {
      return NextResponse.json({ error: 'Email đã được sử dụng!' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // Hết hạn sau 2 phút

    if (existing && !existing.is_verified) {
      // Cập nhật lại thông tin nếu user chưa xác thực nhưng đăng ký lại
      const { error: updateError } = await supabase.from('users').update({
        fullName: name,
        password: hashedPassword,
        verification_otp: otp,
        otp_expires_at: otpExpiresAt,
      }).eq('email', email);

      if (updateError) throw updateError;
    } else {
      // Tạo user mới - để Supabase tự sinh UUID và createdAt
      const { error: insertError } = await supabase.from('users').insert({
        fullName: name,
        email: email,
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
        from: 'Acme <onboarding@resend.dev>',
        to: email,
        subject: 'FitnessTracker - Mã OTP Xác Thực',
        html: `<h1>Xin chào ${name}!</h1><p>Mã xác thực OTP của bạn là: <strong>${otp}</strong></p><p>Vui lòng nhập mã này trên web để kích hoạt tài khoản.</p>`
      });
    }

    return NextResponse.json({ success: true, email });
  } catch (err: unknown) {
    console.error('[register] Error:', err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    if (typeof err === 'object' && err !== null && 'message' in err) {
      return NextResponse.json({ error: (err as { message: string }).message }, { status: 500 });
    }
    return NextResponse.json({ error: JSON.stringify(err) }, { status: 500 });
  }
}
