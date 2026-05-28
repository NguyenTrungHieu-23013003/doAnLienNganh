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
      .select('id, verification_otp, is_verified')
      .eq('email', email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    }

    if (user.is_verified) {
      return NextResponse.json({ success: true, message: 'Tài khoản đã được xác thực' });
    }

    if (user.verification_otp !== otp) {
      return NextResponse.json({ error: 'Mã OTP không đúng' }, { status: 400 });
    }

    // Kích hoạt tài khoản
    const { error } = await supabase
      .from('users')
      .update({ is_verified: true, verification_otp: null })
      .eq('id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
