'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/shared/components/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { User } from '@/shared/types';
import {
  UserCheck, Users, Dumbbell, Star,
  CheckCircle2, AlertCircle, Loader2, UserX,
} from 'lucide-react';

interface CoachWithStats extends User {
  studentCount: number;
}

export default function ChooseCoachPage() {
  const { t } = useTranslation();
  const { data: session, update: updateSession } = useSession();
  const currentUser = session?.user as {
    id: string; role: string; fullName: string; coachId?: string;
  } | undefined;

  const [coaches, setCoaches] = useState<CoachWithStats[]>([]);
  const [currentCoach, setCurrentCoach] = useState<User | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<CoachWithStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isUnassignOpen, setIsUnassignOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      // Fetch all coaches + actual user record (không dùng session vì có thể stale)
      const [coachesRes, userRes] = await Promise.all([
        fetch('/api/users?role=coach', { cache: 'no-store' }),
        fetch(`/api/users/${currentUser.id}`, { cache: 'no-store' }),
      ]);

      const coachesList: User[] = await coachesRes.json();
      const userData = await userRes.json();
      const actualCoachId: string | null = userData?.coachId ?? null;

      // Fetch student counts per coach
      const coachesWithStats: CoachWithStats[] = await Promise.all(
        coachesList.map(async (coach) => {
          const studentsRes = await fetch(`/api/users?coachId=${coach.id}`, { cache: 'no-store' });
          const students: User[] = await studentsRes.json();
          return { ...coach, studentCount: students.length };
        })
      );
      setCoaches(coachesWithStats);

      // Lấy thông tin coach hiện tại từ dữ liệu thực tế (không phụ thuộc session)
      if (actualCoachId) {
        const found = coachesList.find((c) => c.id === actualCoachId);
        if (found) {
          const stats = coachesWithStats.find((c) => c.id === actualCoachId);
          setCurrentCoach(stats ?? { ...found, studentCount: 0 });
        } else {
          // Coach không nằm trong danh sách (bị xóa?), fetch riêng
          const coachRes = await fetch(`/api/users/${actualCoachId}`, { cache: 'no-store' });
          if (coachRes.ok) setCurrentCoach({ ...(await coachRes.json()), studentCount: 0 });
          else setCurrentCoach(null);
        }
      } else {
        setCurrentCoach(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectCoach = (coach: CoachWithStats) => {
    setSelectedCoach(coach);
    setIsConfirmOpen(true);
  };

  const handleConfirmCoach = async () => {
    if (!currentUser || !selectedCoach) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: selectedCoach.id }),
      });
      if (!res.ok) throw new Error('Failed');
      await updateSession({ coachId: selectedCoach.id });
      setIsConfirmOpen(false);
      setCurrentCoach(selectedCoach);
      await fetchData();
      showToast('success', `Bạn đã chọn ${selectedCoach.fullName} làm huấn luyện viên!`);
    } catch {
      showToast('error', 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnassign = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: '' }),
      });
      if (!res.ok) throw new Error('Failed');
      await updateSession({ coachId: null });
      setIsUnassignOpen(false);
      setCurrentCoach(null);
      await fetchData();
      showToast('success', 'Đã hủy liên kết với huấn luyện viên.');
    } catch {
      showToast('error', 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-green-950/90 border-green-700/40 text-green-300'
              : 'bg-red-950/90 border-red-700/40 text-red-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            {t('Choose Your Coach')}
          </h1>
          <p className="text-sm text-zinc-500 mt-1 ml-[52px]">
            {t('Select a personal trainer to guide your fitness journey')}
          </p>
        </div>

        {/* Current Coach Banner */}
        {currentCoach ? (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-green-600/10 to-emerald-600/10 border border-green-600/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-green-500/20">
                {currentCoach.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-0.5">
                  {t('Your Current Coach')}
                </p>
                <p className="text-base font-bold">{currentCoach.fullName}</p>
                <p className="text-xs text-zinc-500">{currentCoach.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-green-400" />
              <button
                onClick={() => setIsUnassignOpen(true)}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-500/10"
              >
                <UserX className="w-3.5 h-3.5" />
                {t('Unassign')}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-amber-600/5 border border-amber-600/20 flex items-center gap-4">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-300">{t('No coach assigned yet')}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {t('Choose a coach below to start your personalized training program')}
              </p>
            </div>
          </div>
        )}

        {/* Coaches Grid */}
        <Card className="border-zinc-800">
          <CardHeader
            title={t('Available Coaches')}
            subtitle={t('Select a coach to view their profile and assign them')}
          >
            <span className="text-xs font-bold text-zinc-500 bg-zinc-800 px-2.5 py-1 rounded-full">
              {coaches.length} {t('coaches')}
            </span>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm">{t('Loading coaches...')}</p>
              </div>
            ) : coaches.length === 0 ? (
              <div className="text-center py-16 text-zinc-600">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">{t('No coaches available at the moment')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coaches.map((coach) => {
                  const isCurrentCoach = currentCoach?.id === coach.id;
                  return (
                    <div
                      key={coach.id}
                      className={`relative rounded-2xl border p-5 transition-all duration-200 group ${
                        isCurrentCoach
                          ? 'border-green-600/40 bg-green-600/5'
                          : 'border-zinc-800 bg-zinc-950/50 hover:border-blue-600/40 hover:bg-blue-600/5 cursor-pointer'
                      }`}
                      onClick={() => !isCurrentCoach && handleSelectCoach(coach)}
                    >
                      {isCurrentCoach && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-green-600/20 text-green-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          {t('Current')}
                        </div>
                      )}

                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg ${
                              isCurrentCoach
                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/20'
                                : 'bg-gradient-to-br from-blue-600 to-blue-800 shadow-blue-500/20'
                            }`}
                          >
                            {coach.fullName.charAt(0).toUpperCase()}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{coach.fullName}</p>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">{coach.email}</p>

                          <div className="flex items-center gap-3 mt-3">
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                              <Users className="w-3.5 h-3.5 text-blue-400" />
                              <span>
                                {coach.studentCount} {t('students')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                              <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                              <span>{t('Personal Trainer')}</span>
                            </div>
                          </div>

                          {/* Rating stars (decorative) */}
                          <div className="flex items-center gap-0.5 mt-2">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className="w-3 h-3 fill-amber-400 text-amber-400"
                              />
                            ))}
                            <span className="text-[10px] text-zinc-500 ml-1">5.0</span>
                          </div>
                        </div>
                      </div>

                      {/* CTA */}
                      {!isCurrentCoach && (
                        <div className="mt-4 pt-4 border-t border-zinc-800/50 group-hover:border-blue-600/20 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-600 group-hover:text-blue-400 transition-colors font-medium">
                              {currentCoach
                                ? t('Switch to this coach')
                                : t('Choose this coach')}
                            </span>
                            <div className="w-6 h-6 rounded-full bg-blue-600/10 group-hover:bg-blue-600 text-blue-400 group-hover:text-white flex items-center justify-center transition-all">
                              <UserCheck className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirm Select Modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={currentCoach ? t('Switch Coach') : t('Choose Coach')}
      >
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-600/5 border border-blue-600/20">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-lg font-bold text-white shrink-0">
              {selectedCoach?.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold">{selectedCoach?.fullName}</p>
              <p className="text-xs text-zinc-500">{selectedCoach?.email}</p>
              <p className="text-xs text-blue-400 mt-1">
                {selectedCoach?.studentCount} {t('students currently training')}
              </p>
            </div>
          </div>

          {currentCoach && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {t('You are switching from')} <strong>{currentCoach.fullName}</strong>.{' '}
                {t('Your existing tasks will remain.')}
              </span>
            </div>
          )}

          <p className="text-sm text-zinc-400">
            {t('Are you sure you want to')}{' '}
            {currentCoach ? t('switch to') : t('choose')}{' '}
            <strong className="text-white">{selectedCoach?.fullName}</strong>{' '}
            {t('as your coach?')}
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isSaving}
            >
              {t('Cancel')}
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleConfirmCoach}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('Saving...')}
                </span>
              ) : (
                t('Confirm')
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unassign Modal */}
      <Modal
        isOpen={isUnassignOpen}
        onClose={() => setIsUnassignOpen(false)}
        title={t('Remove Coach')}
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-zinc-300">
              {t('Are you sure you want to remove')}{' '}
              <strong>{currentCoach?.fullName}</strong>{' '}
              {t('as your coach? You can always choose a new coach later.')}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsUnassignOpen(false)}
              disabled={isSaving}
            >
              {t('Cancel')}
            </Button>
            <Button
              variant="outline"
              className="flex-1 !border-red-600/40 !text-red-400 hover:!bg-red-500/10"
              onClick={handleUnassign}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('Removing...')}
                </span>
              ) : (
                t('Remove Coach')
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
