import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email là bắt buộc' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, fullName, is_verified')
      .eq('email', email)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json({ error: 'Tài khoản không tồn tại!' }, { status: 400 });
    }

    if (user.is_verified) {
      return NextResponse.json({ error: 'Tài khoản đã được xác thực trước đó.' }, { status: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // Hết hạn sau 2 phút

    const { error: updateError } = await supabase
      .from('users')
      .update({ verification_otp: otp, otp_expires_at: otpExpiresAt })
      .eq('email', email);

    if (updateError) throw updateError;
    
    // Gửi email chứa OTP qua Resend
    if (process.env.RESEND_API_KEY) {
       const { Resend } = await import('resend');
       const resend = new Resend(process.env.RESEND_API_KEY);
       try {
         await resend.emails.send({
            from: 'Acme <onboarding@resend.dev>',
            to: email, // Note: In free tier, only verified domain emails work, but this matches register logic
            subject: 'FitnessTracker - Mã OTP Xác Thực Mới',
            html: `<h1>Xin chào ${user.fullName}!</h1><p>Mã xác thực OTP mới của bạn là: <strong>${otp}</strong></p><p>Vui lòng nhập mã này trên web để kích hoạt tài khoản.</p>`
         });
       } catch (emailError: unknown) {
         console.error('Error sending resend OTP email:', emailError);
       }
    }
    
    return NextResponse.json({ success: true, message: 'Đã gửi lại OTP thành công.' });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}
