import { NextRequest, NextResponse } from "next/server";

const MODAL_API_URL =
  process.env.MODAL_API_URL ||
  "https://nkjain92--ace-step-v15-web.modal.run";

function detectMimeType(contentType: string | null): { mime: string; ext: string } {
  if (contentType?.includes("flac")) return { mime: "audio/flac", ext: "flac" };
  if (contentType?.includes("wav")) return { mime: "audio/wav", ext: "wav" };
  return { mime: "audio/mpeg", ext: "mp3" };
}

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("job_id");
  const index = req.nextUrl.searchParams.get("index");
  if (!jobId) {
    return NextResponse.json({ error: "job_id required" }, { status: 400 });
  }

  try {
    const audioPath = index !== null ? `/audio/${jobId}/${index}` : `/audio/${jobId}`;
    const res = await fetch(`${MODAL_API_URL}${audioPath}`);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Audio not found" },
        { status: 404 }
      );
    }

    const { mime, ext } = detectMimeType(res.headers.get("content-type"));
    const audioBuffer = await res.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="riff.${ext}"`,
      },
    });
  } catch (err) {
    console.error("Audio fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch audio" },
      { status: 500 }
    );
  }
}
