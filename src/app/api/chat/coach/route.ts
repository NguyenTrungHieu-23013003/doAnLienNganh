import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

// [SEC] Giới hạn kích thước input
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_ITEMS = 20;

export async function POST(request: Request) {
  // [SEC] Kiểm tra xác thực — chỉ coach được dùng endpoint này
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'coach' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: chỉ coach được dùng tính năng này' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { studentId, message, history = [] } = body;

    if (!studentId || !message) {
      return NextResponse.json({ error: 'Missing studentId or message' }, { status: 400 });
    }

    // [SEC] Validate input size
    if (typeof message !== 'string' || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Tin nhắn quá dài (tối đa ${MAX_MESSAGE_LENGTH} ký tự)` }, { status: 400 });
    }
    if (!Array.isArray(history) || history.length > MAX_HISTORY_ITEMS) {
      return NextResponse.json({ error: 'Lịch sử chat không hợp lệ' }, { status: 400 });
    }

    // [SEC] coachId luôn lấy từ session
    const coachId = session.user.id;

    // [SEC] Verify coach có quyền xem studentId này (học viên phải thuộc về coach)
    if (session.user.role === 'coach') {
      const { data: student } = await supabase
        .from('users')
        .select('id, coachId')
        .eq('id', studentId)
        .single();
      if (!student || student.coachId !== coachId) {
        return NextResponse.json({ error: 'Forbidden: học viên này không thuộc về bạn' }, { status: 403 });
      }
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service chưa được cấu hình' }, { status: 500 });
    }

    const { data: studentMetrics } = await supabase
      .from('metrics')
      .select('*')
      .eq('userId', studentId)
      .order('recordedAt', { ascending: false })
      .limit(7);

    const { data: studentTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('userId', studentId)
      .eq('coachId', coachId)
      .order('createdAt', { ascending: false })
      .limit(10);

    const systemPrompt = `You are a coaching assistant. Analyze this student's performance data and help the coach make decisions. Be concise and data-driven.
    
Student's Recent Health Metrics:
${JSON.stringify(studentMetrics || [], null, 2)}

Student's Tasks:
${JSON.stringify(studentTasks || [], null, 2)}
`;

    // [SEC] Sanitize history
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
      { role: 'user', content: message }
    ];

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
      })
    });

    if (!groqRes.ok) {
      console.error('Groq API error (coach):', await groqRes.text());
      return NextResponse.json({ error: 'AI service tạm thời không khả dụng' }, { status: 500 });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || "No advice available at this moment.";

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error("Coach Chat API Error:", error);
    return NextResponse.json({ error: 'Không thể xử lý yêu cầu' }, { status: 500 });
  }
}
