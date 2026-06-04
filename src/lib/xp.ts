import { supabase } from '@/lib/supabase';
import { checkAndAwardBadges } from '@/lib/badges';

export async function awardXp(userId: string, action: string) {
  let xpToAdd = 0;
  let streakAdd = 0;

  switch (action) {
    case 'complete': xpToAdd = 10; streakAdd = 1; break;
    case 'approve': xpToAdd = 15; break;
    case 'ontime': xpToAdd = 5; break;
    case 'metrics': xpToAdd = 5; break;
    case 'streak': xpToAdd = 50; break;
    default: throw new Error('Invalid action');
  }

  // 1. Fetch current XP and Streak
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('xp, streak')
    .eq('id', userId)
    .single();

  if (fetchError || !user) throw fetchError || new Error('User not found');

  const newXp = (user.xp || 0) + xpToAdd;
  const newStreak = (user.streak || 0) + streakAdd;

  // 2. Tạm thời không update last_active để tránh lỗi thiếu cột
  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update({ xp: newXp, streak: newStreak })
    .eq('id', userId)
    .select('xp, streak')
    .single();

  if (updateError) throw updateError;

  // 3. Trigger badge check directly via local function
  try {
    await checkAndAwardBadges(userId);
  } catch (err) {
    console.error('Badge check in awardXp failed:', err);
  }

  return updated;
}
