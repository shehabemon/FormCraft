import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Content } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AI_SYSTEM_PROMPT } from '@/lib/aiPrompt';
import { parseAndValidateAIResponse } from '@/lib/aiParseResponse';

const requestSchema = z.object({
  prompt: z.string().min(3).max(1000),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid request: prompt must be 3–1000 characters' },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'AI generation is not configured on this server' },
      { status: 503 },
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    });

    const contents: Content[] = [
      { role: 'user', parts: [{ text: AI_SYSTEM_PROMPT }] },
      {
        role: 'model',
        parts: [{ text: 'I understand. I will output only valid JSON matching the specified schema. Send me the form description.' }],
      },
      { role: 'user', parts: [{ text: parsed.data.prompt }] },
    ];

    const result = await model.generateContent({ contents });

    const responseText = result.response.text();
    const parseResult = parseAndValidateAIResponse(responseText);

    if (parseResult.success) {
      return NextResponse.json({ success: true, schema: parseResult.schema });
    }

    return NextResponse.json(
      {
        success: false,
        error: parseResult.error,
        rawResponse: responseText.substring(0, 500),
      },
      { status: 422 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('429') || message.toLowerCase().includes('quota')) {
      return NextResponse.json(
        { success: false, error: 'AI service is temporarily busy. Please try again in a moment.' },
        { status: 429 },
      );
    }

    if (message.toLowerCase().includes('safety')) {
      return NextResponse.json(
        { success: false, error: 'Your prompt was flagged by content filters. Please rephrase and try again.' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: 'AI generation failed. Please try again.' },
      { status: 500 },
    );
  }
}
