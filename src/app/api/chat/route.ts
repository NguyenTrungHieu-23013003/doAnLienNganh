import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Build system prompt
    const systemPrompt = `You are a personal fitness coach. Use the user's real health data below to answer. Be specific, friendly, and concise.
    
User's Recent Health Metrics:
${JSON.stringify(userMetrics || [], null, 2)}

User's Recently Completed Tasks:
${JSON.stringify(userTasks || [], null, 2)}
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
