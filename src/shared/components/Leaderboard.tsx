'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardContent } from './Card';
import { Trophy, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type LeaderboardUser = { id: string; name: string; xp: number; streak: number; rank: number };

export default function Leaderboard({ isCoachView = false }: { isCoachView?: boolean }) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [scope, setScope] = useState<'global' | 'group'>(isCoachView ? 'group' : 'global');
  const [data, setData] = useState<{ leaderboard: LeaderboardUser[], currentUserData: LeaderboardUser | null, error?: string } | null>(null);

  const user = session?.user as any;

  useEffect(() => {
    if (!user) return;
    const fetchLeaderboard = async () => {
      const url = new URL('/api/leaderboard', window.location.origin);
      url.searchParams.set('scope', scope);
      url.searchParams.set('userId', user.id);
      if (user.coachId) url.searchParams.set('coachId', user.coachId);

      const res = await fetch(url.toString());
      setData(await res.json());
    };
    fetchLeaderboard();
  }, [scope, user]);

  return (
    <Card className="border-zinc-800 bg-zinc-950">
      <CardHeader title={t("Leaderboard")} subtitle={t("Rankings & XP")} />
      <CardContent>
        {/* Toggle Scope Toggle */}
        {!isCoachView && user?.coachId && (
          <div className="flex bg-zinc-900 rounded-lg p-1 mb-4">
            <button
              onClick={() => setScope('global')}
              className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${scope === 'global' ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-zinc-500'}`}
            >
              {t("Global")}
            </button>
            <button
              onClick={() => setScope('group')}
              className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${scope === 'group' ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-zinc-500'}`}
            >
              {t("My Group")}
            </button>
          </div>
        )}

        {/* List */}
        <div className="space-y-2">
          {data?.error ? (
            <div className="text-center text-sm text-red-500 py-4">{data.error}</div>
          ) : (
            <>
              {data?.leaderboard?.map((u) => (
                <UserRow key={u.id} user={u} isMe={u.id === user?.id} />
              ))}
              
              {data?.currentUserData && !data?.leaderboard?.find(u => u.id === data.currentUserData!.id) && (
                <>
                  <div className="text-center text-xs text-zinc-600 pb-1">...</div>
                  <UserRow user={data.currentUserData} isMe={true} />
                </>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function UserRow({ user, isMe }: { user: LeaderboardUser, isMe: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${isMe ? 'bg-blue-900/20 border-blue-500/30' : 'bg-zinc-900/30 border-transparent'} transition-all`}>
      <div className={`w-8 text-center font-black text-lg ${user.rank === 1 ? 'text-amber-400' : user.rank === 2 ? 'text-zinc-300' : user.rank === 3 ? 'text-orange-400' : 'text-zinc-600'}`}>
        #{user.rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm truncate ${isMe ? 'text-blue-50' : 'text-zinc-200'}`}>
          {user.name || 'Anonymous'} {isMe && '(You)'}
        </p>
        <p className="text-xs text-zinc-500 font-bold flex items-center gap-1">
          <Trophy className="w-3 h-3 text-amber-500" /> {user.xp} XP
        </p>
      </div>
      {user.streak > 0 && (
        <div className="flex items-center gap-1 bg-orange-500/10 text-orange-400 px-2.5 py-1 rounded-full text-xs font-bold">
          <Flame className="w-3.5 h-3.5" /> {user.streak}
        </div>
      )}
    </div>
  );
}
