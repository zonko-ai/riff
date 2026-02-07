import { NextRequest, NextResponse } from "next/server";

const MODAL_API_URL =
  process.env.MODAL_API_URL ||
  "https://nkjain92--ace-step-v15-web.modal.run";

// Submit a job to the queue
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validTaskTypes = ["text2music", "cover", "repaint", "complete", "lego", "extract"];
    const taskType = validTaskTypes.includes(body.task_type) ? body.task_type : "text2music";
    const validFormats = ["mp3", "wav", "flac"];
    const audioFormat = validFormats.includes(body.audio_format) ? body.audio_format : "mp3";

    const payload = {
      caption: body.caption || "upbeat electronic dance music",
      lyrics: body.lyrics || "[Instrumental]",
      duration: Math.min(Math.max(body.duration || 30, 10), 600),
      bpm: body.bpm || null,
      keyscale: body.keyscale || null,
      timesignature: body.timesignature || null,
      instrumental: body.instrumental || false,
      vocal_language: body.vocal_language || null,
      seed: typeof body.seed === "number" ? body.seed : null,
      // Task type and audio references
      task_type: taskType,
      src_audio_path: body.src_audio_path || null,
      reference_audio_path: body.reference_audio_path || null,
      // Generation params
      inference_steps: Math.min(Math.max(body.inference_steps ?? 8, 1), 20),
      thinking: body.thinking ?? true,
      infer_method: body.infer_method === "sde" ? "sde" : "ode",
      shift: Math.min(Math.max(body.shift ?? 3.0, 1.0), 5.0),
      guidance_scale: Math.min(Math.max(body.guidance_scale ?? 7.0, 1.0), 15.0),
      audio_format: audioFormat,
      batch_size: Math.min(Math.max(body.batch_size ?? 1, 1), 4),
      // Repaint params
      repainting_start: Math.max(body.repainting_start ?? 0, 0),
      repainting_end: body.repainting_end ?? -1,
      // Cover params
      audio_cover_strength: Math.min(Math.max(body.audio_cover_strength ?? 1.0, 0), 1),
      // CoT controls
      use_cot_metas: body.use_cot_metas ?? true,
      use_cot_caption: body.use_cot_caption ?? true,
      use_cot_language: body.use_cot_language ?? true,
      // LM params
      lm_temperature: Math.min(Math.max(body.lm_temperature ?? 0.85, 0), 2),
      lm_cfg_scale: Math.min(Math.max(body.lm_cfg_scale ?? 2.0, 1), 3),
      lm_top_k: Math.min(Math.max(body.lm_top_k ?? 0, 0), 100),
      lm_top_p: Math.min(Math.max(body.lm_top_p ?? 0.9, 0), 1),
      lm_negative_prompt: body.lm_negative_prompt || null,
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
    console.log("[generate] Submitted job:", data.job_id);
    return NextResponse.json({
      ...data,
      _debug: { payload, modal_url: `${MODAL_API_URL}/queue/submit` },
    });
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
  const cancel = req.nextUrl.searchParams.get("cancel");
  if (!jobId) {
    return NextResponse.json({ error: "job_id required" }, { status: 400 });
  }

  try {
    if (cancel) {
      const res = await fetch(`${MODAL_API_URL}/queue/cancel/${jobId}`);
      if (!res.ok) {
        return NextResponse.json(
          { error: "Failed to cancel job" },
          { status: 500 }
        );
      }
      const data = await res.json();
      return NextResponse.json({ cancelled: data.cancelled });
    }

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
