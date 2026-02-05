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
    const {
      prompt,
      vibe,
      lyricsDensity,
      variant,
      baseLyrics,
      baseCaption,
      contrast,
    } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const densityMap: Record<string, string> = {
      light: "Write minimal lyrics — just a verse and short chorus, with instrumental breaks. Keep it to about 20-30 seconds of vocal content.",
      moderate: "Write 2 verses and a chorus. Balance between vocals and instrumentals. Suitable for a 30-60 second song.",
      heavy: "Write dense, lyric-heavy content — 3 verses, chorus, and a bridge. Lots of vocal content. Suitable for 60-120 seconds.",
    };
    const densityInstruction = densityMap[lyricsDensity || "moderate"];

    const contrastMap: Record<string, string> = {
      subtle: "Keep changes subtle but noticeable, with small shifts in phrasing and instrumentation.",
      balanced: "Make it distinctly different in groove, instrumentation, and melodic phrasing.",
      bold: "Reimagine it in a different genre or tempo with clearly different phrasing.",
    };

    const variantInstruction =
      variant === "alternate"
        ? `Create an alternate version that is clearly different from the original.
${contrast ? contrastMap[contrast] || "" : ""}
${baseLyrics ? "Avoid reusing lines from the reference lyrics." : ""}`
        : "";

    const referenceBlock =
      baseLyrics || baseCaption
        ? `Reference context (do not copy verbatim):
${baseCaption ? `Caption: ${baseCaption}` : ""}
${baseLyrics ? `Lyrics: ${baseLyrics}` : ""}`
        : "";

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
1. A music caption (1-2 sentences describing the genre, mood, instruments, tempo, vocal style — max 500 chars)
2. Song lyrics with section markers like [Verse], [Chorus], [Bridge], [Outro]

${vibe ? `The mood/vibe should be: ${vibe}` : ""}

${densityInstruction}

${variantInstruction}

${referenceBlock}

The lyrics should be personal, emotional, and match the user's description.
If names are mentioned, weave them naturally into the lyrics.

Respond in this exact JSON format:
{
  "caption": "your music description here",
  "lyrics": "[Verse]\\nLyrics here...\\n\\n[Chorus]\\nChorus here..."
}

Only respond with valid JSON, no markdown or extra text.`,
          },
          { role: "user", content: prompt },
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

    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      caption: parsed.caption,
      lyrics: parsed.lyrics,
    });
  } catch (err) {
    console.error("Lyrics generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate lyrics. Please try again." },
      { status: 500 }
    );
  }
}
