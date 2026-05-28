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

    const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Email đã tồn tại!' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Mã 6 số ngẫu nhiên
    
    // We add password field implicitly since the db schema handles it or we manually added it
    const { error } = await supabase.from('users').insert({
      id: `user-${crypto.randomUUID()}`,
      fullName: name,
      email: email,
      password: hashedPassword,
      role: 'user', // Mặc định tất cả người đăng ký mới là 'user'
      is_verified: false,
      verification_otp: otp,
      createdAt: new Date().toISOString()
    });

    if (error) throw error;
    
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
