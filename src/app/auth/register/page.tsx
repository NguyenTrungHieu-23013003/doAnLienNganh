'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/Button';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import Link from 'next/link';
import { Activity } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      const data = await res.json();
      // Redirect sang trang xác thực OTP kèm email
      router.push(`/auth/verify?email=${encodeURIComponent(data.email || formData.email)}`);
    } else {
      const data = await res.json();
      setError(data.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-md p-4 relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/20">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tạo Tài Khoản Mới</h1>
        </div>

        <Card className="glass-morphism border-zinc-800">
          <CardHeader title="Tham gia Fitness Tracker" subtitle="Điền thông tin để bắt đầu" className="border-zinc-800" />
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <input type="text" placeholder="Họ và Tên" required className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-white rounded-lg focus:outline-none focus:border-blue-500" onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <input type="email" placeholder="Email" required className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-white rounded-lg focus:outline-none focus:border-blue-500" onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              <input type="password" placeholder="Mật khẩu" required className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-white rounded-lg focus:outline-none focus:border-blue-500" onChange={(e) => setFormData({ ...formData, password: e.target.value })} />

              <div className="min-h-5">
                {error && <p className="text-red-500 text-sm animate-pulse">{error}</p>}
              </div>
              <Button type="submit" className="w-full py-4 text-base" isLoading={isLoading}>Đăng Ký</Button>
            </form>
            <p className="mt-4 text-center text-sm text-zinc-400">Đã có tài khoản? <Link href="/auth/login" className="text-blue-500 hover:underline">Đăng nhập</Link></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
