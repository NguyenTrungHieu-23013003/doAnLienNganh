'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardContent } from './Card';
import { useTranslation } from 'react-i18next';

const BADGE_CONFIG = [
  { type: 'streak_7', icon: '🔥', name: '7-Day Streak', desc: 'Maintain a 7-day streak', max: 7, getProgress: (u: any) => u?.streak || 0 },
  { type: 'streak_30', icon: '🌟', name: '30-Day Streak', desc: 'Maintain a 30-day streak', max: 30, getProgress: (u: any) => u?.streak || 0 },
  { type: 'tasks_10', icon: '💪', name: 'Task Beginner', desc: 'Complete 10 tasks', max: 10, getProgress: (_u: any, t: any[]) => t.filter((x:any)=>x.status==='done').length },
  { type: 'tasks_50', icon: '🏆', name: 'Task Master', desc: 'Complete 50 tasks', max: 50, getProgress: (_u: any, t: any[]) => t.filter((x:any)=>x.status==='done').length },
  { type: 'early_bird', icon: '⚡', name: 'Early Bird', desc: 'Submit 5 tasks early', max: 5, getProgress: (_u: any, t: any[]) => t.filter((x:any)=>x.status==='done' && x.completedAt && x.dueDate && new Date(x.completedAt) < new Date(x.dueDate)).length },
  { type: 'xp_100', icon: '🎯', name: 'Novice', desc: 'Earn 100 XP', max: 100, getProgress: (u: any) => u?.xp || 0 },
  { type: 'xp_500', icon: '👑', name: 'Legend', desc: 'Earn 500 XP', max: 500, getProgress: (u: any) => u?.xp || 0 },
];

export default function BadgeDisplay() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const user = session?.user as any;
  const [data, setData] = useState<any>(null);
  
  useEffect(() => {
    if (!user) return;
    fetch(`/api/badges/check?userId=${user.id}`).then(res => res.json()).then(setData);
  }, [user]);

  if (!data) return null;

  const earnedMap = new Map(data.badges?.map((b: any) => [b.type, b.earnedAt]));

  return (
    <Card className="border-zinc-800 bg-zinc-950 mt-6">
      <CardHeader title={t("Badges")} subtitle={t("Your achievements and progress")} />
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {BADGE_CONFIG.map(config => {
            const isEarned = earnedMap.has(config.type);
            const progress = Math.min(config.getProgress(data.user, data.tasks || []), config.max);
            const earnedVal = earnedMap.get(config.type);
            const date = isEarned && earnedVal ? new Date(earnedVal as string | number).toLocaleDateString() : null;

            return (
              <div key={config.type} className={`relative group p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${isEarned ? 'bg-zinc-900 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-zinc-950/50 border-zinc-800 opacity-60 hover:opacity-100'}`}>
                <div className="text-4xl mb-2 filter drop-shadow-md">{isEarned ? config.icon : '🔒'}</div>
                <p className={`font-bold text-sm ${isEarned ? 'text-yellow-400' : 'text-zinc-500'}`}>{t(config.name)}</p>
                
                {isEarned ? (
                  <p className="text-[10px] text-zinc-500 mt-1">{t("Earned")} {date}</p>
                ) : (
                  <div className="w-full mt-2">
                    <div className="h-1.5 bg-zinc-800 rounded-full w-full overflow-hidden">
                      <div className="h-full bg-zinc-600 rounded-full" style={{ width: `${(progress / config.max) * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">{progress} / {config.max}</p>
                  </div>
                )}
                
                {/* Tooltip */}
                <div className="absolute inset-0 bg-blue-900/95 text-white opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center text-xs px-2 text-center transition-opacity z-10 font-medium">
                  {t(config.desc)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
