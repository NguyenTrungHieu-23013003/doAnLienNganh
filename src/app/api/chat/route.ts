import { NextResponse } from 'next/server';
import { readDb } from '@/lib/mockDb';
import { HealthMetric, Task } from '@/shared/types';

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

    // Fetch latest user data
    const allMetrics = await readDb<HealthMetric>('metrics');
    const allTasks = await readDb<Task>('tasks');

    const userMetrics = allMetrics
      .filter((m) => m.userId === userId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      .slice(0, 7);

    const userTasks = allTasks
      .filter((t) => t.userId === userId && t.status === 'done')
      .sort((a, b) => {
        const dateA = a.completedAt || a.createdAt;
        const dateB = b.completedAt || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 5);

    // Build system prompt
    const systemPrompt = `You are a personal fitness coach. Use the user's real health data below to answer. Be specific, friendly, and concise.
    
User's Recent Health Metrics:
${JSON.stringify(userMetrics, null, 2)}

User's Recently Completed Tasks:
${JSON.stringify(userTasks, null, 2)}
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
    const reply = data.choices?.[0]?.message?.content || "I am here to help!";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: 'Failed to process chat request.' }, { status: 500 });
  }
}
