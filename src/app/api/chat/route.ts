import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import { getExerciseContext } from '@/lib/exercises';

// [SEC] Giới hạn kích thước input để tránh tốn Groq token / DoS
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_ITEMS = 20;

export async function POST(request: Request) {
  // [SEC] Kiểm tra xác thực
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { message, history = [] } = body;

    // [SEC] userId luôn lấy từ session, không tin vào body
    const userId = session.user.id;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    // [SEC] Validate input size
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Tin nhắn quá dài (tối đa ${MAX_MESSAGE_LENGTH} ký tự)` },
        { status: 400 }
      );
    }
    if (!Array.isArray(history) || history.length > MAX_HISTORY_ITEMS) {
      return NextResponse.json(
        { error: 'Lịch sử chat không hợp lệ hoặc quá dài' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service chưa được cấu hình' }, { status: 500 });
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

    // [SEC] Chỉ nhận history có role hợp lệ để tránh prompt injection
    const safeHistory = history
      .filter((m: unknown) => {
        if (typeof m !== 'object' || m === null) return false;
        const msg = m as Record<string, unknown>;
        return (msg.role === 'user' || msg.role === 'assistant') &&
          typeof msg.content === 'string' &&
          msg.content.length <= MAX_MESSAGE_LENGTH;
      })
      .slice(-MAX_HISTORY_ITEMS);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...safeHistory,
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
      console.error('Groq API error:', await groqRes.text());
      return NextResponse.json({ error: 'AI service tạm thời không khả dụng' }, { status: 500 });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || 'Tôi ở đây để giúp bạn!';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Không thể xử lý yêu cầu chat' }, { status: 500 });
  }
}
