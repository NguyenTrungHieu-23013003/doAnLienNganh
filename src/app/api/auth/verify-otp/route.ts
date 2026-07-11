import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Thiếu email hoặc mã OTP' }, { status: 400 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, verification_otp, otp_expires_at, is_verified')
      .eq('email', email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    }

    if (user.is_verified) {
      return NextResponse.json({ success: true, message: 'Tài khoản đã được xác thực' });
    }

    if (!user.verification_otp) {
      return NextResponse.json({ error: 'Mã OTP không hợp lệ' }, { status: 400 });
    }

    if (user.otp_expires_at && new Date() > new Date(user.otp_expires_at)) {
      return NextResponse.json({ error: 'Mã OTP đã hết hạn, vui lòng gửi lại mã mới' }, { status: 400 });
    }

    // So sánh OTP trực tiếp (không cần split string nữa)
    if (user.verification_otp !== otp) {
      return NextResponse.json({ error: 'Mã OTP không đúng' }, { status: 400 });
    }

    // Kích hoạt tài khoản, xóa OTP
    const { error } = await supabase
      .from('users')
      .update({ is_verified: true, verification_otp: null, otp_expires_at: null })
      .eq('id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  }
}
