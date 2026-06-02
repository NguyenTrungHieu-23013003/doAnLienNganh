import { NextResponse } from 'next/server';
import { readDb } from '@/lib/mockDb';
import { HealthMetric, Task } from '@/shared/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { coachId, studentId, message, history = [] } = body;

    if (!coachId || !studentId || !message) {
      return NextResponse.json({ error: 'Missing coachId, studentId, or message' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    const allMetrics = await readDb<HealthMetric>('metrics');
    const allTasks = await readDb<Task>('tasks');

    const studentMetrics = allMetrics
      .filter((m) => m.userId === studentId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      .slice(0, 7);

    const studentTasks = allTasks
      .filter((t) => t.userId === studentId && t.coachId === coachId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const systemPrompt = `You are a coaching assistant. Analyze this student's performance data and help the coach make decisions. Be concise and data-driven.
    
Student's Recent Health Metrics:
${JSON.stringify(studentMetrics, null, 2)}

Student's Tasks:
${JSON.stringify(studentTasks, null, 2)}
`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
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
      const errorData = await groqRes.text();
      return NextResponse.json({ error: `Groq API Error: ${errorData}` }, { status: 500 });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || "No advice available at this moment.";

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error("Coach Chat API Error:", error);
    return NextResponse.json({ error: 'Failed to process coach chat request.' }, { status: 500 });
  }
}
