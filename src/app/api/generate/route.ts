import { NextRequest, NextResponse } from "next/server";

const MODAL_API_URL =
  process.env.MODAL_API_URL ||
  "https://nkjain92--ace-step-v15-web.modal.run";

// Submit a job to the queue
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const payload = {
      caption: body.caption || "upbeat electronic dance music",
      lyrics: body.lyrics || "[Instrumental]",
      duration: Math.min(Math.max(body.duration || 30, 10), 120),
      bpm: body.bpm || null,
    };

    const res = await fetch(`${MODAL_API_URL}/queue/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json(
        { error: `Failed to submit: ${error}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data); // { job_id, position }
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json(
      { error: "Failed to submit. Please try again." },
      { status: 500 }
    );
  }
}

// Poll job status
export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("job_id");
  if (!jobId) {
    return NextResponse.json({ error: "job_id required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${MODAL_API_URL}/queue/status/${jobId}`);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Status poll error:", err);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
