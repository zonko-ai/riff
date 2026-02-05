"""
ACE-Step v1.5 on Modal.com — with job queue

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
AUDIO_DIR = "/tmp/riff-audio"
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
    gpu="A10G",
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
# Web endpoint with job queue
# ---------------------------------------------------------------------------
@app.function(
    gpu="A10G",
    volumes={MODEL_DIR: model_volume, SHARED_AUDIO_DIR: audio_volume},
    timeout=600,
    scaledown_window=600,
    memory=32768,
    max_containers=10,
    min_containers=1,
)
@modal.concurrent(max_inputs=5)
@modal.asgi_app()
def web():
    import os, uuid, time, threading, traceback, io, tempfile
    import soundfile as sf

    os.environ["HF_HOME"] = f"{MODEL_DIR}/hf_cache"
    os.makedirs(SHARED_AUDIO_DIR, exist_ok=True)
    _setup_checkpoints_symlink()

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

    # ---- Model singleton ----
    _models: dict = {}
    _model_lock = threading.Lock()

    def get_handlers():
        if "dit" not in _models:
            with _model_lock:
                if "dit" not in _models:
                    from acestep.handler import AceStepHandler
                    from acestep.llm_inference import LLMHandler

                    print("Loading DiT model...")
                    dit = AceStepHandler()
                    dit.initialize_service(
                        project_root="/app/ACE-Step-1.5",
                        config_path="acestep-v15-turbo",
                        device="cuda",
                    )
                    print("Loading LM model...")
                    llm = LLMHandler()
                    try:
                        llm.initialize(
                            checkpoint_dir=CKPT_DIR,
                            lm_model_path="acestep-5Hz-lm-0.6B",
                            backend="vllm",
                            device="cuda",
                        )
                    except Exception as e:
                        print(f"vllm failed ({e}), falling back to transformers")
                        llm.initialize(
                            checkpoint_dir=CKPT_DIR,
                            lm_model_path="acestep-5Hz-lm-0.6B",
                            backend="transformers",
                            device="cuda",
                        )
                    _models["dit"] = dit
                    _models["llm"] = llm
                    print("Models ready.")
        return _models["dit"], _models["llm"]

    # ---- Job Queue ----
    _gpu_lock = threading.Lock()
    _queue_lock = threading.Lock()
    _jobs: dict = {}       # job_id -> {status, position, params, audio_path, error, created_at}
    _queue: list = []      # ordered job_ids waiting
    _active: set = set()   # currently generating

    MAX_CONCURRENT = 1
    JOB_TTL = 1800  # 30 min

    def _cleanup_old_jobs():
        now = time.time()
        with _queue_lock:
            expired = [jid for jid, j in _jobs.items()
                       if now - j["created_at"] > JOB_TTL
                       and j["status"] in ("complete", "failed")]
            for jid in expired:
                path = _jobs[jid].get("audio_path")
                if path and os.path.exists(path):
                    os.remove(path)
                del _jobs[jid]
                try:
                    del jobs_store[jid]
                except KeyError:
                    pass

    def _process_job(job_id: str, params: dict):
        """Run generation (called from a thread)."""
        try:
            import random
            from acestep.inference import GenerationParams, GenerationConfig, generate_music

            dit, llm = get_handlers()

            gen_params = GenerationParams(
                caption=params["caption"],
                lyrics=params.get("lyrics", "[Instrumental]"),
                duration=params.get("duration", 30),
                bpm=params.get("bpm"),
                keyscale=params.get("keyscale") or "",
                timesignature=params.get("timesignature") or "",
                instrumental=params.get("instrumental", False),
                vocal_language=params.get("vocal_language") or "unknown",
                seed=random.randint(0, 2**31 - 1),
                inference_steps=8,
                thinking=True,
                shift=3.0,
            )
            config = GenerationConfig(batch_size=1, audio_format="mp3")

            with _gpu_lock:
                with tempfile.TemporaryDirectory() as tmpdir:
                    result = generate_music(dit, llm, gen_params, config, save_dir=tmpdir)

            if not result.success:
                raise RuntimeError(result.error or "Generation failed")

            audio_info = result.audios[0]
            audio_np = audio_info["tensor"].numpy()
            if audio_np.ndim == 2:
                audio_np = audio_np.T

            audio_path = os.path.join(SHARED_AUDIO_DIR, f"{job_id}.mp3")
            sf.write(audio_path, audio_np, audio_info["sample_rate"], format="MP3")
            audio_volume.commit()

            with _queue_lock:
                _active.discard(job_id)
                if job_id in _jobs:
                    _jobs[job_id]["status"] = "complete"
                    _jobs[job_id]["audio_path"] = audio_path
                    jobs_store[job_id] = {"status": "complete", "audio_path": audio_path}

        except Exception as e:
            tb = traceback.format_exc()
            print(f"Job {job_id} failed:\n{tb}")
            with _queue_lock:
                _active.discard(job_id)
                if job_id in _jobs:
                    _jobs[job_id]["status"] = "failed"
                    _jobs[job_id]["error"] = str(e)
                    jobs_store[job_id] = {"status": "failed", "error": str(e)}

        # Process next job in queue
        _try_process_next()

    def _try_process_next():
        """Check if we can start the next queued job."""
        with _queue_lock:
            if not _queue or len(_active) >= MAX_CONCURRENT:
                return
            job_id = _queue.pop(0)
            _active.add(job_id)
            _jobs[job_id]["status"] = "generating"

        t = threading.Thread(target=_process_job, args=(job_id, _jobs[job_id]["params"]))
        t.daemon = True
        t.start()

    # ---- API Models ----
    class SubmitRequest(BaseModel):
        caption: str = "upbeat electronic dance music"
        lyrics: str = "[Instrumental]"
        duration: float = Field(30, ge=10, le=120)
        bpm: int | None = None
        keyscale: str | None = None
        timesignature: str | None = None
        instrumental: bool = False
        vocal_language: str | None = None

    # ---- Endpoints ----
    @web_app.get("/")
    def root():
        return {"service": "ACE-Step v1.5 with Queue"}

    @web_app.get("/health")
    def health():
        with _queue_lock:
            return {
                "status": "ok",
                "models_loaded": "dit" in _models,
                "queue_length": len(_queue),
                "active_jobs": len(_active),
            }

    @web_app.post("/queue/submit")
    def queue_submit(req: SubmitRequest):
        _cleanup_old_jobs()

        job_id = str(uuid.uuid4())
        with _queue_lock:
            position = len(_queue) + len(_active)
            _jobs[job_id] = {
                "status": "queued" if position > 0 else "queued",
                "position": position,
                "params": req.model_dump(),
                "audio_path": None,
                "error": None,
                "created_at": time.time(),
            }
            _queue.append(job_id)

        jobs_store[job_id] = {"status": "queued", "position": position}
        _try_process_next()

        return {"job_id": job_id, "position": position}

    @web_app.get("/queue/status/{job_id}")
    def queue_status(job_id: str):
        # Check local state first
        with _queue_lock:
            job = _jobs.get(job_id)

        if job:
            result = {
                "job_id": job_id,
                "status": job["status"],
                "error": job.get("error"),
            }
            if job["status"] == "queued":
                try:
                    result["position"] = _queue.index(job_id) + 1
                    result["queue_length"] = len(_queue)
                except ValueError:
                    result["position"] = 0
            elif job["status"] == "complete":
                result["audio_url"] = f"/audio/{job_id}"
            return result

        # Fall back to shared state (job may be on another container)
        try:
            shared_job = jobs_store[job_id]
            result = {
                "job_id": job_id,
                "status": shared_job["status"],
                "error": shared_job.get("error"),
            }
            if shared_job["status"] == "complete":
                result["audio_url"] = f"/audio/{job_id}"
            return result
        except KeyError:
            return JSONResponse(status_code=404, content={"error": "Job not found"})

    @web_app.get("/queue/cancel/{job_id}")
    def queue_cancel(job_id: str):
        with _queue_lock:
            if job_id in _queue:
                _queue.remove(job_id)
                _jobs[job_id]["status"] = "cancelled"
                return {"cancelled": True}
            return {"cancelled": False, "reason": "Job not in queue (may already be processing)"}

    @web_app.get("/audio/{job_id}")
    def get_audio(job_id: str):
        # Check local state first
        with _queue_lock:
            job = _jobs.get(job_id)

        if job and job["status"] == "complete" and job.get("audio_path"):
            path = job["audio_path"]
        else:
            # Try shared volume
            audio_volume.reload()
            path = os.path.join(SHARED_AUDIO_DIR, f"{job_id}.mp3")

        if not os.path.exists(path):
            return JSONResponse(status_code=404, content={"error": "Audio not found"})

        return FileResponse(
            path,
            media_type="audio/mpeg",
            filename="riff.mp3",
        )

    # ---- Legacy direct endpoint (still useful for testing) ----
    @web_app.post("/generate_file")
    def generate_file_legacy(req: SubmitRequest):
        """Synchronous generation — blocks until done."""
        import random
        from acestep.inference import GenerationParams, GenerationConfig, generate_music

        dit, llm = get_handlers()

        params = GenerationParams(
            caption=req.caption,
            lyrics=req.lyrics,
            duration=req.duration,
            bpm=req.bpm,
            keyscale=req.keyscale or "",
            timesignature=req.timesignature or "",
            instrumental=req.instrumental,
            vocal_language=req.vocal_language or "unknown",
            seed=random.randint(0, 2**31 - 1),
            inference_steps=8,
            thinking=True,
            shift=3.0,
        )
        config = GenerationConfig(batch_size=1, audio_format="mp3")

        with _gpu_lock:
            with tempfile.TemporaryDirectory() as tmpdir:
                result = generate_music(dit, llm, params, config, save_dir=tmpdir)

        if not result.success:
            return JSONResponse(status_code=500, content={"error": result.error})

        audio_info = result.audios[0]
        audio_np = audio_info["tensor"].numpy()
        if audio_np.ndim == 2:
            audio_np = audio_np.T

        buf = io.BytesIO()
        sf.write(buf, audio_np, audio_info["sample_rate"], format="MP3")
        buf.seek(0)

        from fastapi.responses import Response
        return Response(
            content=buf.read(),
            media_type="audio/mpeg",
            headers={"Content-Disposition": 'attachment; filename="riff.mp3"'},
        )

    return web_app
