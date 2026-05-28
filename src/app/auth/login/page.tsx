'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/Button';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { Activity, Dumbbell, ShieldCheck } from 'lucide-react';
import { useTranslation } from "react-i18next";
import Link from 'next/link';

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        // Kiểm tra nếu lỗi là email chưa xác thực
        if (res.error.includes('UNVERIFIED_EMAIL') || res.code === 'UNVERIFIED_EMAIL') {
          router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
        } else {
          setError('Sai email hoặc mật khẩu.');
        }
      } else {
        router.push('/'); 
        router.refresh(); 
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />

      <div className="w-full max-w-md p-4 relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/20">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{t("Fitness Tracker")}</h1>
        </div>

        <Card className="glass-morphism border-zinc-800">
          <CardHeader title="Welcome Back" subtitle="Sign in to your account" className="border-zinc-800" />
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t("Email Address")}</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:border-blue-500 transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mật Khẩu</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:border-blue-500 transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-red-500 text-sm animate-pulse">{error}</p>}

              <Button type="submit" className="w-full py-6 text-base" isLoading={isLoading}>
                {t("Sign In")}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-zinc-400">
               Chưa có tài khoản? <Link href="/auth/register" className="text-blue-500 hover:underline">Đăng ký ngay</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
