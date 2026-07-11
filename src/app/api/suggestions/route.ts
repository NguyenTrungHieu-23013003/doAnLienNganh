import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { HealthMetric } from '@/shared/types';
import { searchExercises, buildExerciseContext } from '@/lib/exercises';

// GET /api/suggestions?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  let query = supabase.from('suggestions').select('*').order('createdAt', { ascending: false });
  if (userId) query = query.eq('userId', userId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/suggestions — generate a new AI suggestion (Groq + Local Dataset)
export async function POST(request: Request) {
  const body = await request.json();
  const { userId, taskId } = body;

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
  }

  // 1. Fetch last 7 metrics entries for the user from Supabase
  const { data: userMetrics, error: metricsError } = await supabase
    .from('metrics')
    .select('*')
    .eq('userId', userId)
    .order('recordedAt', { ascending: false })
    .limit(7);

  if (metricsError || !userMetrics || userMetrics.length === 0) {
    return NextResponse.json({ error: 'No health metrics found to analyze.' }, { status: 400 });
  }

  // 2. Fetch recent completed tasks to understand what user has been doing
  const { data: recentTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('userId', userId)
    .eq('status', 'done')
    .order('completedAt', { ascending: false })
    .limit(5);

  // ── RAG-lite: pick exercises based on user's metrics & recent tasks ────────
  // Build a search query from recent task titles + user's likely focus areas
  const taskTitles = (recentTasks || [])
    .map((t: { title?: string }) => t.title)
    .filter(Boolean)
    .join(' ');

  // Determine focus area from metrics (e.g., high body fat → cardio, low weight → strength)
  const latestMetric = userMetrics[0] as HealthMetric;
  let focusQuery = taskTitles || 'full body workout';
  if (latestMetric?.bodyFatPercentage && latestMetric.bodyFatPercentage >= 25) {
    focusQuery += ' cardio weight loss';
  } else if (latestMetric?.weight && latestMetric.weight < 55) {
    focusQuery += ' strength muscle building';
  }

  const recommendedExercises = searchExercises(focusQuery, {}, 5);
  const exerciseContext = recommendedExercises.length > 0
    ? `\n\n## Recommended exercises from fitness database:\n${buildExerciseContext(recommendedExercises)}`
    : '';
  // ──────────────────────────────────────────────────────────────────────────

  // 3. Build a system prompt with metrics + local dataset knowledge
  const systemPrompt = `Bạn là huấn luyện viên thể hình và dinh dưỡng cá nhân. 
Hãy phân tích dữ liệu sức khỏe của người dùng và đưa ra gợi ý cụ thể, súc tích.
Chỉ trả lời bằng tiếng Việt. Không chào hỏi. Phản hồi 2-3 câu ngắn gọn.
Khi gợi ý bài tập, ưu tiên dùng tên bài tập từ cơ sở dữ liệu fitness bên dưới.`;

  const userMessage = `Dữ liệu sức khỏe người dùng (mới nhất trước):\n${JSON.stringify(userMetrics, null, 2)}\n\nBài tập gần đây đã hoàn thành:\n${JSON.stringify(recentTasks || [], null, 2)}${exerciseContext}`;

  // 4. Send to Groq
  let suggestionText = '';
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok) {
      const errorData = await groqRes.text();
      throw new Error(`Groq API Error: ${groqRes.status} - ${errorData}`);
    }

    const data = await groqRes.json();
    suggestionText =
      data.choices?.[0]?.message?.content || 'Cố gắng lên, bạn đang làm rất tốt!';
  } catch (error: unknown) {
    console.error('Groq Integration Error:', error);
    return NextResponse.json({ error: 'Failed to generate insight from Groq.' }, { status: 500 });
  }

  const newSuggestion = {
    userId,
    taskId: taskId || null,
    suggestion: suggestionText,
    type: 'insight',
  };

  // 5. Save Groq response via Supabase
  const { data: created, error: insertError } = await supabase
    .from('suggestions')
    .insert(newSuggestion)
    .select()
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // 6. Notify the user
  await supabase.from('notifications').insert({
    userId,
    title: 'Gợi ý AI Mới',
    message: 'Bạn có một phân tích luyện tập mới từ AI dựa trên 1.324 bài tập',
    isRead: false,
  });

  // 7. Return response to client
  return NextResponse.json(created, { status: 201 });
}
