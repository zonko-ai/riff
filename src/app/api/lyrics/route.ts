import { NextRequest, NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY;

export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json(
      { error: "XAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-4-1-fast-non-reasoning",
        messages: [
          {
            role: "system",
            content: `You are a professional songwriter. Given a description, generate:
1. A music caption (1-2 sentences describing the genre, mood, instruments, tempo)
2. Song lyrics with section markers like [Verse], [Chorus], [Bridge], [Outro]

The lyrics should be personal, emotional, and match the user's description.
If names are mentioned, weave them naturally into the lyrics.
Keep it to 2-3 verses and a chorus (suitable for a 30-60 second song).

Respond in this exact JSON format:
{
  "caption": "your music description here",
  "lyrics": "[Verse]\\nLyrics here...\\n\\n[Chorus]\\nChorus here...",
  "duration": 45
}

Only respond with valid JSON, no markdown or extra text.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.9,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Grok API error:", error);
      return NextResponse.json(
        { error: "Failed to generate lyrics" },
        { status: 500 }
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse the JSON response from Grok
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      caption: parsed.caption,
      lyrics: parsed.lyrics,
      duration: parsed.duration || 45,
    });
  } catch (err) {
    console.error("Lyrics generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate lyrics. Please try again." },
      { status: 500 }
    );
  }
}
