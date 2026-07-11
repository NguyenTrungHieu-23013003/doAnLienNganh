import { supabase } from '@/lib/supabase';

export async function checkAndAwardBadges(userId: string) {
  // 1. Fetch user xp and streak
  const { data: user } = await supabase.from('users').select('xp, streak').eq('id', userId).single();
  if (!user) throw new Error('User not found in badges check');

  // 2. Fetch user tasks directly via Supabase
  const { data: tasks } = await supabase.from('tasks').select('*').eq('userId', userId);
  const userTasks = tasks || [];

  const doneTasks = userTasks.filter((t: any) => t.status === 'done');
  const earlyTasks = doneTasks.filter((t: any) => t.completedAt && t.dueDate && new Date(t.completedAt) < new Date(t.dueDate));

  // 3. Check existing badges
  const { data: earnedBadges } = await supabase.from('badges').select('type').eq('userId', userId);
  const earnedSet = new Set((earnedBadges || []).map((b: any) => b.type));

  const checkCondition = (type: string, condition: boolean) => (condition && !earnedSet.has(type) ? type : null);

  const newTypes = [
    checkCondition('streak_7', user.streak >= 7),
    checkCondition('streak_30', user.streak >= 30),
    checkCondition('tasks_10', doneTasks.length >= 10),
    checkCondition('tasks_50', doneTasks.length >= 50),
    checkCondition('early_bird', earlyTasks.length >= 5),
    checkCondition('xp_100', user.xp >= 100),
    checkCondition('xp_500', user.xp >= 500)
  ].filter(Boolean) as string[];

  // 4. Insert new badges
  if (newTypes.length > 0) {
    const inserts = newTypes.map(type => ({ userId, type }));
    await supabase.from('badges').insert(inserts);

    // Add notification for new badges
    for (const type of newTypes) {
      await supabase.from('notifications').insert({
        userId,
        title: 'Huy hiệu mới! 🎉',
        message: `Bạn vừa đạt được huy hiệu mới: ${type.toUpperCase()}`,
        isRead: false
      });
    }

    // Award bonus XP for specific badges
    if (newTypes.includes('streak_7')) {
      await supabase.rpc('increment_xp', { user_id: userId, amount: 50 });
      await supabase.from('notifications').insert({
        userId,
        title: 'Thưởng chuỗi 7 ngày! 🔥',
        message: 'Bạn được tặng thêm 50 XP vì đã giữ chuỗi 7 ngày liên tiếp.',
        isRead: false
      });
    }
  }

  return { newBadges: newTypes, user, tasks: userTasks, badges: earnedBadges || [] };
}
