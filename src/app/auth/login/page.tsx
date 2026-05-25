'use client';

import React, { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/Button';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { Activity, Dumbbell, ShieldCheck } from 'lucide-react';
import { useTranslation } from "react-i18next";

export default function LoginPage() {
    const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(email);
    if (!success) {
      setError('Invalid email or user does not exist.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
      {/* Background blobs for premium feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />

      <div className="w-full max-w-md p-4 relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/20">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{t("Fitness Tracker")}</h1>
          <p className="text-zinc-500 mt-2">{t("Personal Health & Fitness Management")}</p>
        </div>

        <Card className="glass-morphism border-zinc-800">
          <CardHeader title="Welcome Back" subtitle="Sign in to your account" className="border-zinc-800" />
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-1">
                <label htmlFor="email" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t("Email Address")}</label>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@fitness.com"
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && <p className="text-red-500 text-sm animate-pulse">{error}</p>}

              <Button type="submit" className="w-full py-6 text-base" isLoading={isLoading}>
                {t("Sign In")}</Button>
            </form>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <ShieldCheck className="w-5 h-5 text-blue-500 mb-1" />
                <span className="text-[10px] text-zinc-500 uppercase font-bold">{t("Admin")}</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <Dumbbell className="w-5 h-5 text-purple-500 mb-1" />
                <span className="text-[10px] text-zinc-500 uppercase font-bold">{t("Coach")}</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <Activity className="w-5 h-5 text-green-500 mb-1" />
                <span className="text-[10px] text-zinc-500 uppercase font-bold">{t("User")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center mt-8 text-zinc-500 text-sm">
          {t("Tip: Use")}<code className="text-zinc-300">{t("admin@fitness.com")}</code> {t("to login as Admin")}</p>
      </div>
    </div>
  );
}
