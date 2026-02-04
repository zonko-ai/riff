import { NextRequest, NextResponse } from "next/server";

const MODAL_API_URL =
  process.env.MODAL_API_URL ||
  "https://nkjain92--ace-step-v15-web.modal.run";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const payload = {
      caption: body.caption || "upbeat electronic dance music",
      lyrics: body.lyrics || "[Instrumental]",
      duration: Math.min(Math.max(body.duration || 30, 10), 120),
      bpm: body.bpm || null,
      seed: -1,
      inference_steps: 8,
      thinking: true,
      batch_size: 1,
      audio_format: "mp3",
    };

    const res = await fetch(`${MODAL_API_URL}/generate_file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json(
        { error: `Generation failed: ${error}` },
        { status: 500 }
      );
    }

    const audioBuffer = await res.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'attachment; filename="riff.mp3"',
      },
    });
  } catch (err) {
    console.error("Generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate music. Please try again." },
      { status: 500 }
    );
  }
}
