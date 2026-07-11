import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getExerciseContext } from '@/lib/exercises';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, message, history = [] } = body;

    if (!userId || !message) {
      return NextResponse.json({ error: 'Missing userId or message' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    // Fetch latest user data from Supabase
    const { data: userMetrics } = await supabase
      .from('metrics')
      .select('*')
      .eq('userId', userId)
      .order('recordedAt', { ascending: false })
      .limit(7);

    const { data: userTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('userId', userId)
      .eq('status', 'done')
      .order('completedAt', { ascending: false })
      .limit(5);

    // ── RAG-lite: retrieve relevant exercises from local dataset ───────────
    const exerciseContext = getExerciseContext(message, 4);
    // ──────────────────────────────────────────────────────────────────────

    // Build system prompt with user context + exercise knowledge base
    const systemPrompt = `You are a personal fitness coach with deep expertise in exercise science. 
Use the user's real health data below to give specific, personalized advice. Be friendly and concise.

## User's Recent Health Metrics:
${JSON.stringify(userMetrics || [], null, 2)}

## User's Recently Completed Exercises:
${JSON.stringify(userTasks || [], null, 2)}${exerciseContext}

INSTRUCTIONS:
- Always refer to specific exercises by name when relevant
- If you recommend exercises, use ones from the fitness database above when available
- Keep responses focused and actionable (2-4 sentences)
- Respond in Vietnamese (Tiếng Việt) unless the user writes in another language`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ];

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok) {
      const errorData = await groqRes.text();
      return NextResponse.json({ error: `Groq API Error: ${errorData}` }, { status: 500 });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || 'Tôi ở đây để giúp bạn!';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Failed to process chat request.' }, { status: 500 });
  }
}
