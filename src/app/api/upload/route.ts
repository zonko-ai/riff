import { NextRequest, NextResponse } from "next/server";

const MODAL_API_URL =
  process.env.MODAL_API_URL ||
  "https://nkjain92--ace-step-v15-web.modal.run";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/mp4",
  "audio/ogg",
  "audio/x-m4a",
  "audio/aac",
]);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 50MB)" },
        { status: 400 }
      );
    }

    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    // Proxy to Modal
    const uploadForm = new FormData();
    uploadForm.append("file", file);

    const res = await fetch(`${MODAL_API_URL}/upload_audio`, {
      method: "POST",
      body: uploadForm,
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json(
        { error: `Upload failed: ${error}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload audio" },
      { status: 500 }
    );
  }
}
