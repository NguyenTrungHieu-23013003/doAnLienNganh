'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity } from 'lucide-react';
import { Button } from '@/shared/components/Button';

export default function VerifyOTPPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) router.replace('/auth/register');
  }, [email, router]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Vui lòng nhập đủ 6 chữ số'); return; }
    setIsLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Xác thực thất bại'); return; }
      setSuccess('Tài khoản đã được kích hoạt! Đang chuyển đến trang đăng nhập...');
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch {
      setError('Lỗi kết nối, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black" style={{ background: 'radial-gradient(ellipse at top, #0f172a 0%, #000000 100%)' }}>
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30 mb-4">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Xác Thực Email</h1>
          <p className="text-sm text-zinc-500 mt-2 text-center">
            Nhập mã 6 chữ số đã được gửi đến<br />
            <span className="text-blue-400 font-medium">{email}</span>
          </p>
        </div>

        {/* OTP Boxes */}
        <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-zinc-950 text-white transition-all duration-150 focus:outline-none"
              style={{ borderColor: digit ? '#3b82f6' : '#27272a' }}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-600/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-600/10 border border-green-600/20 text-green-400 text-sm text-center">
            {success}
          </div>
        )}

        <Button onClick={handleVerify} className="w-full py-4 text-base" isLoading={isLoading}>
          Xác Nhận
        </Button>

        <p className="text-center text-sm text-zinc-600 mt-4">
          Không nhận được mã?{' '}
          {resendCooldown > 0 ? (
            <span className="text-zinc-500">Gửi lại sau {resendCooldown}s</span>
          ) : (
            <button
              className="text-blue-400 hover:text-blue-300 font-semibold"
              onClick={() => {
                setResendCooldown(60);
                // TODO: Call resend OTP API
              }}
            >
              Gửi lại
            </button>
          )}
        </p>
        <p className="text-center text-sm text-zinc-600 mt-3">
          <button className="text-zinc-500 hover:text-zinc-300" onClick={() => router.push('/auth/register')}>
            ← Quay lại đăng ký
          </button>
        </p>
      </div>
    </div>
  );
}
