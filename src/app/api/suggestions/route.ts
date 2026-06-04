import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { HealthMetric } from '@/shared/types';

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

// POST /api/suggestions — generate a new AI suggestion (Groq Real API)
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

  // 2. Build a system prompt
  const systemPrompt = "You are a fitness and nutrition coach. Analyze the user health data and give specific, concise feedback. Respond in 2-3 short sentences. ONLY respond in Vietnamese language (Tiếng Việt). Do not use introductory greetings.";
  const userMessage = `User Metrics Data (Latest first):\n${JSON.stringify(userMetrics, null, 2)}`;

  // 3. Send metrics as user message to Groq
  let suggestionText = '';
  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
      })
    });

    if (!groqRes.ok) {
      const errorData = await groqRes.text();
      throw new Error(`Groq API Error: ${groqRes.status} - ${errorData}`);
    }

    const data = await groqRes.json();
    suggestionText = data.choices?.[0]?.message?.content || "Cố gắng lên, bạn đang làm rất tốt!";
  } catch (error: unknown) {
    console.error("Groq Integration Error:", error);
    return NextResponse.json({ error: 'Failed to generate insight from Groq.' }, { status: 500 });
  }

  const newSuggestion = {
    userId,
    taskId: taskId || null,
    suggestion: suggestionText,
    type: 'insight',
  };

  // 4. Save Groq response via Supabase
  const { data: created, error: insertError } = await supabase.from('suggestions').insert(newSuggestion).select().single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  
  // Ghi thêm thông báo
  await supabase.from('notifications').insert({
    userId,
    title: 'Gợi ý AI Mới',
    message: 'Bạn có một phân tích luyện tập mới từ AI',
    isRead: false,
  });

  // 5. Return response to client
  return NextResponse.json(created, { status: 201 });
}
