"""
ACE-Step v1.5 on Modal.com — parallel track generation

Setup (one-time):
    modal run ace_step_modal.py::download_models

Deploy:
    modal deploy ace_step_modal.py
"""

import modal

ace_step_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "ffmpeg", "libsndfile1")
    .pip_install(
        "torch==2.7.1",
        "torchaudio==2.7.1",
        "torchvision==0.22.1",
        extra_index_url="https://download.pytorch.org/whl/cu128",
    )
    .pip_install("packaging", "setuptools", "wheel")
    .run_commands(
        "git clone --depth=1 https://github.com/ACE-Step/ACE-Step-1.5.git /app/ACE-Step-1.5"
    )
    .run_commands(
        "cd /app/ACE-Step-1.5 && pip install ./acestep/third_parts/nano-vllm"
    )
    .run_commands("cd /app/ACE-Step-1.5 && pip install .")
)

app = modal.App("ace-step-v15", image=ace_step_image)

model_volume = modal.Volume.from_name("ace-step-models", create_if_missing=True)
MODEL_DIR = "/models"
CKPT_DIR = "/usr/local/lib/python3.11/site-packages/checkpoints"
VOL_CKPT = f"{MODEL_DIR}/checkpoints"
jobs_store = modal.Dict.from_name("riff-jobs", create_if_missing=True)
audio_volume = modal.Volume.from_name("riff-audio", create_if_missing=True)
SHARED_AUDIO_DIR = "/shared-audio"


def _setup_checkpoints_symlink():
    import os, shutil
    if os.path.exists(VOL_CKPT):
        if os.path.islink(CKPT_DIR):
            return
        if os.path.isdir(CKPT_DIR):
            shutil.rmtree(CKPT_DIR)
        os.symlink(VOL_CKPT, CKPT_DIR)


@app.function(
    volumes={MODEL_DIR: model_volume},
    gpu="A100",
    timeout=1800,
)
def download_models():
    import os, subprocess
    os.environ["HF_HOME"] = f"{MODEL_DIR}/hf_cache"
    os.makedirs(VOL_CKPT, exist_ok=True)
    if os.path.islink(CKPT_DIR) or os.path.isdir(CKPT_DIR):
        subprocess.run(["rm", "-rf", CKPT_DIR], check=True)
    os.symlink(VOL_CKPT, CKPT_DIR)
    for model in ("main", "acestep-5Hz-lm-0.6B"):
        print(f"Downloading {model}...")
        subprocess.run(["acestep-download", "--model", model], check=True)
    model_volume.commit()
    print("All models downloaded.")


# ---------------------------------------------------------------------------
# GPU generation function — one per container, Modal handles parallelism
# ---------------------------------------------------------------------------
@app.cls(
    gpu="A100",
    volumes={MODEL_DIR: model_volume, SHARED_AUDIO_DIR: audio_volume},
    timeout=900,
    scaledown_window=600,
    memory=32768,
    max_containers=10,
    min_containers=1,
)
class GenerateTrack:
    @modal.enter()
    def load_model(self):
        import os
        os.environ["HF_HOME"] = f"{MODEL_DIR}/hf_cache"
        os.makedirs(SHARED_AUDIO_DIR, exist_ok=True)
        _setup_checkpoints_symlink()

        from acestep.handler import AceStepHandler
        from acestep.llm_inference import LLMHandler

        print("Loading DiT model...")
        self.dit = AceStepHandler()
        self.dit.initialize_service(
            project_root="/app/ACE-Step-1.5",
            config_path="acestep-v15-turbo",
            device="cuda",
        )
        print("Loading LM model...")
        self.llm = LLMHandler()
        try:
            self.llm.initialize(
                checkpoint_dir=CKPT_DIR,
                lm_model_path="acestep-5Hz-lm-0.6B",
                backend="vllm",
                device="cuda",
            )
        except Exception as e:
            print(f"vllm failed ({e}), falling back to transformers")
            self.llm.initialize(
                checkpoint_dir=CKPT_DIR,
                lm_model_path="acestep-5Hz-lm-0.6B",
                backend="transformers",
                device="cuda",
            )
        print("Models ready.")

    @modal.method()
    def run(self, job_id: str, params: dict):
        import os, random, traceback, tempfile
        import soundfile as sf
        from acestep.inference import GenerationParams, GenerationConfig, generate_music

        # Check if cancelled before starting
        try:
            job = jobs_store[job_id]
            if job.get("status") == "cancelled":
                print(f"Job {job_id} was cancelled, skipping.")
                return
        except KeyError:
            pass

        # Mark as generating
        jobs_store[job_id] = {"status": "generating"}

        try:
            task_type = params.get("task_type", "text2music")
            audio_ext = params.get("audio_format", "mp3")
            batch_size = params.get("batch_size", 1)

            gen_params = GenerationParams(
                task_type=task_type,
                caption=params["caption"],
                lyrics=params.get("lyrics", "[Instrumental]"),
                duration=params.get("duration", 30),
                bpm=params.get("bpm"),
                keyscale=params.get("keyscale") or "",
                timesignature=params.get("timesignature") or "",
                instrumental=params.get("instrumental", False),
                vocal_language=params.get("vocal_language") or "unknown",
                seed=params.get("seed") if params.get("seed") is not None else random.randint(0, 2**31 - 1),
                inference_steps=params.get("inference_steps", 8),
                thinking=params.get("thinking", True),
                infer_method=params.get("infer_method", "ode"),
                shift=params.get("shift", 3.0),
                guidance_scale=params.get("guidance_scale", 7.0),
                reference_audio=params.get("reference_audio_path"),
                src_audio=params.get("src_audio_path"),
                repainting_start=params.get("repainting_start", 0.0),
                repainting_end=params.get("repainting_end", -1),
                audio_cover_strength=params.get("audio_cover_strength", 1.0),
                use_cot_metas=params.get("use_cot_metas", True),
                use_cot_caption=params.get("use_cot_caption", True),
                use_cot_language=params.get("use_cot_language", True),
                lm_temperature=params.get("lm_temperature", 0.85),
                lm_cfg_scale=params.get("lm_cfg_scale", 2.0),
                lm_top_k=params.get("lm_top_k", 0),
                lm_top_p=params.get("lm_top_p", 0.9),
                lm_negative_prompt=params.get("lm_negative_prompt") or "NO USER INPUT",
            )
            print(f"Job {job_id} task={task_type}, steps={gen_params.inference_steps}, "
                  f"thinking={gen_params.thinking}, method={gen_params.infer_method}, "
                  f"shift={gen_params.shift}, guidance={gen_params.guidance_scale}, "
                  f"format={audio_ext}, batch={batch_size}")
            config = GenerationConfig(batch_size=batch_size, audio_format=audio_ext)

            with tempfile.TemporaryDirectory() as tmpdir:
                result = generate_music(self.dit, self.llm, gen_params, config, save_dir=tmpdir)

            if not result.success:
                raise RuntimeError(result.error or "Generation failed")

            # Extract task: return metadata instead of audio
            if task_type == "extract":
                metadata = {}
                if result.extra_outputs:
                    lm_raw = result.extra_outputs.get("lm_metadata", {})
                    lm_meta: dict = lm_raw[0] if isinstance(lm_raw, list) and lm_raw else (lm_raw if isinstance(lm_raw, dict) else {})
                    metadata = {
                        "bpm": lm_meta.get("bpm"),
                        "key": lm_meta.get("keyscale", ""),
                        "timesignature": lm_meta.get("timesignature", ""),
                        "caption": lm_meta.get("caption", ""),
                        "language": lm_meta.get("vocal_language", ""),
                    }
                jobs_store[job_id] = {"status": "complete", "extract_metadata": metadata}
                print(f"Job {job_id} extract complete: {metadata}")
                return

            # Audio output
            SF_FORMAT = {"mp3": "MP3", "wav": "WAV", "flac": "FLAC"}
            fmt = SF_FORMAT.get(audio_ext, "MP3")

            if batch_size > 1 and len(result.audios) > 1:
                audio_urls = []
                for i, audio_info in enumerate(result.audios):
                    audio_np = audio_info["tensor"].numpy()
                    if audio_np.ndim == 2:
                        audio_np = audio_np.T
                    path = os.path.join(SHARED_AUDIO_DIR, f"{job_id}_{i}.{audio_ext}")
                    sf.write(path, audio_np, audio_info["sample_rate"], format=fmt)
                    audio_urls.append(f"/audio/{job_id}/{i}")
                audio_volume.commit()
                jobs_store[job_id] = {"status": "complete", "audio_urls": audio_urls}
            else:
                audio_info = result.audios[0]
                audio_np = audio_info["tensor"].numpy()
                if audio_np.ndim == 2:
                    audio_np = audio_np.T
                audio_path = os.path.join(SHARED_AUDIO_DIR, f"{job_id}.{audio_ext}")
                sf.write(audio_path, audio_np, audio_info["sample_rate"], format=fmt)
                audio_volume.commit()
                jobs_store[job_id] = {"status": "complete", "audio_path": audio_path}

            print(f"Job {job_id} complete.")

        except Exception as e:
            tb = traceback.format_exc()
            print(f"Job {job_id} failed:\n{tb}")
            jobs_store[job_id] = {"status": "failed", "error": str(e)}


# ---------------------------------------------------------------------------
# Thin HTTP API — no GPU, just submit/status/cancel/audio
# ---------------------------------------------------------------------------
@app.function(
    volumes={SHARED_AUDIO_DIR: audio_volume},
    timeout=600,
    scaledown_window=300,
    memory=512,
    max_containers=2,
    min_containers=1,
)
@modal.concurrent(max_inputs=50)
@modal.asgi_app()
def web():
    import os, uuid

    os.makedirs(SHARED_AUDIO_DIR, exist_ok=True)

    from fastapi import FastAPI
    from fastapi.responses import FileResponse, JSONResponse
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field

    web_app = FastAPI(title="ACE-Step v1.5")
    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ---- API Models ----
    class SubmitRequest(BaseModel):
        caption: str = "upbeat electronic dance music"
        lyrics: str = "[Instrumental]"
        duration: float = Field(30, ge=10, le=600)
        bpm: int | None = None
        keyscale: str | None = None
        timesignature: str | None = None
        instrumental: bool = False
        vocal_language: str | None = None
        seed: int | None = None
        # Task type and audio references
        task_type: str = "text2music"
        src_audio_path: str | None = None
        reference_audio_path: str | None = None
        # Generation params
        inference_steps: int = Field(8, ge=1, le=20)
        thinking: bool = True
        infer_method: str = "ode"
        shift: float = Field(3.0, ge=1.0, le=5.0)
        guidance_scale: float = Field(7.0, ge=1.0, le=15.0)
        audio_format: str = "mp3"
        batch_size: int = Field(1, ge=1, le=4)
        # Repaint params
        repainting_start: float = Field(0.0, ge=0.0)
        repainting_end: float = -1
        # Cover params
        audio_cover_strength: float = Field(1.0, ge=0.0, le=1.0)
        # CoT controls
        use_cot_metas: bool = True
        use_cot_caption: bool = True
        use_cot_language: bool = True
        # LM params
        lm_temperature: float = Field(0.85, ge=0, le=2)
        lm_cfg_scale: float = Field(2.0, ge=1, le=3)
        lm_top_k: int = Field(0, ge=0, le=100)
        lm_top_p: float = Field(0.9, ge=0, le=1)
        lm_negative_prompt: str | None = None

    # ---- Upload endpoint ----
    from fastapi import UploadFile, File as FastAPIFile

    @web_app.post("/upload_audio")
    async def upload_audio(file: UploadFile = FastAPIFile(...)):
        allowed_exts = {".mp3", ".wav", ".flac", ".ogg", ".m4a"}
        ext = os.path.splitext(file.filename or "upload.mp3")[1].lower()
        if ext not in allowed_exts:
            return JSONResponse(status_code=400, content={"error": f"Unsupported format: {ext}"})

        upload_dir = os.path.join(SHARED_AUDIO_DIR, "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"{uuid.uuid4()}{ext}"
        path = os.path.join(upload_dir, filename)

        contents = await file.read()
        if len(contents) > 50 * 1024 * 1024:
            return JSONResponse(status_code=400, content={"error": "File too large (max 50MB)"})

        with open(path, "wb") as f:
            f.write(contents)
        audio_volume.commit()
        return {"path": path}

    # ---- Endpoints ----
    @web_app.get("/")
    def root():
        return {"service": "ACE-Step v1.5"}

    @web_app.get("/health")
    def health():
        return {"status": "ok"}

    @web_app.post("/queue/submit")
    def queue_submit(req: SubmitRequest):
        job_id = str(uuid.uuid4())
        jobs_store[job_id] = {"status": "queued"}

        # Spawn generation on a separate GPU container
        GenerateTrack().run.spawn(job_id, req.model_dump())

        return {"job_id": job_id, "position": 0}

    @web_app.get("/queue/status/{job_id}")
    def queue_status(job_id: str):
        try:
            job = jobs_store[job_id]
        except KeyError:
            return JSONResponse(status_code=404, content={"error": "Job not found"})

        result = {
            "job_id": job_id,
            "status": job["status"],
            "error": job.get("error"),
        }
        if job["status"] == "complete":
            if "extract_metadata" in job:
                result["extract_metadata"] = job["extract_metadata"]
            elif "audio_urls" in job:
                result["audio_urls"] = job["audio_urls"]
            else:
                result["audio_url"] = f"/audio/{job_id}"
        return result

    @web_app.get("/queue/cancel/{job_id}")
    def queue_cancel(job_id: str):
        try:
            job = jobs_store[job_id]
        except KeyError:
            return {"cancelled": False, "reason": "Job not found"}

        if job["status"] == "queued":
            jobs_store[job_id] = {"status": "cancelled"}
            return {"cancelled": True}
        return {"cancelled": False, "reason": "Job not in queue (may already be processing)"}

    MIME_TYPES = {"mp3": "audio/mpeg", "wav": "audio/wav", "flac": "audio/flac"}

    @web_app.get("/audio/{job_id}")
    def get_audio(job_id: str):
        audio_volume.reload()
        # Try each format
        for ext in ("mp3", "wav", "flac"):
            path = os.path.join(SHARED_AUDIO_DIR, f"{job_id}.{ext}")
            if os.path.exists(path):
                return FileResponse(
                    path,
                    media_type=MIME_TYPES[ext],
                    filename=f"riff.{ext}",
                )
        return JSONResponse(status_code=404, content={"error": "Audio not found"})

    @web_app.get("/audio/{job_id}/{index}")
    def get_audio_batch(job_id: str, index: int):
        audio_volume.reload()
        for ext in ("mp3", "wav", "flac"):
            path = os.path.join(SHARED_AUDIO_DIR, f"{job_id}_{index}.{ext}")
            if os.path.exists(path):
                return FileResponse(
                    path,
                    media_type=MIME_TYPES[ext],
                    filename=f"riff_{index}.{ext}",
                )
        return JSONResponse(status_code=404, content={"error": "Audio not found"})

    # ---- Legacy direct endpoint ----
    @web_app.post("/generate_file")
    def generate_file_legacy(req: SubmitRequest):
        """Synchronous generation — blocks until done."""
        job_id = str(uuid.uuid4())
        jobs_store[job_id] = {"status": "queued"}

        # Call synchronously (blocks until GPU generation completes)
        GenerateTrack().run.remote(job_id, req.model_dump())

        # Read the result
        try:
            job = jobs_store[job_id]
        except KeyError:
            return JSONResponse(status_code=500, content={"error": "Job disappeared"})

        if job["status"] != "complete":
            return JSONResponse(status_code=500, content={"error": job.get("error", "Generation failed")})

        audio_volume.reload()
        # Find the audio file (could be mp3/wav/flac)
        audio_path = None
        audio_ext = "mp3"
        for ext in ("mp3", "wav", "flac"):
            p = os.path.join(SHARED_AUDIO_DIR, f"{job_id}.{ext}")
            if os.path.exists(p):
                audio_path = p
                audio_ext = ext
                break
        if not audio_path:
            return JSONResponse(status_code=500, content={"error": "Audio file not found"})

        with open(audio_path, "rb") as f:
            audio_bytes = f.read()

        from fastapi.responses import Response
        return Response(
            content=audio_bytes,
            media_type=MIME_TYPES.get(audio_ext, "audio/mpeg"),
            headers={"Content-Disposition": f'attachment; filename="riff.{audio_ext}"'},
        )

    return web_app
