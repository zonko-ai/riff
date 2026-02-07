"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { saveTrack, makeTitle } from "@/lib/library";
import { AudioPlayer } from "@/components/audio-player";
import { GeneratingState } from "@/components/generating-state";
import { AudioUpload } from "@/components/audio-upload";
import { Logo } from "@/components/logo";

// ─── Writing Lyrics Animation ───────────────────────────────────────────────

const WRITING_MESSAGES = [
  "Crafting verses...",
  "Finding the right words...",
  "Building the chorus...",
  "Shaping the melody...",
  "Polishing the lyrics...",
];

function WritingLyricsState() {
  const [msgIndex, setMsgIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setMsgIndex((i) => (i + 1) % WRITING_MESSAGES.length), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-elevated rounded-3xl p-8 flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
          <path d="M10 2L12.5 7.5L18 10L12.5 12.5L10 18L7.5 12.5L2 10L7.5 7.5L10 2Z" />
        </svg>
        <span className="text-sm text-muted-foreground">Writing lyrics with AI...</span>
      </div>
      <p className="text-xs text-muted-foreground/60">{WRITING_MESSAGES[msgIndex]}</p>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="size-1.5 rounded-full bg-accent"
            style={{ animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

type AppState =
  | "compose"
  | "writing-lyrics"
  | "preview-lyrics"
  | "queued"
  | "generating"
  | "player";

type TaskType = "text2music" | "cover" | "repaint" | "complete" | "extract";

type LyricsDensity = "light" | "moderate" | "heavy";

type ContrastLevel = "subtle" | "balanced" | "bold";

type VoiceGender = "auto" | "male" | "female";

type TrackDraft = {
  caption: string;
  lyrics: string;
  duration: number;
  instrumental: boolean;
  bpm?: string;
  keyscale?: string;
  timesignature?: string;
  vocal_language?: string;
  seed?: string;
  task_type?: TaskType;
  src_audio_path?: string;
  reference_audio_path?: string;
  inference_steps?: number;
  thinking?: boolean;
  infer_method?: string;
  shift?: number;
  guidance_scale?: number;
  audio_format?: string;
  repainting_start?: number;
  repainting_end?: number;
  audio_cover_strength?: number;
  use_cot_metas?: boolean;
  use_cot_caption?: boolean;
  use_cot_language?: boolean;
  lm_temperature?: number;
  lm_cfg_scale?: number;
  lm_top_k?: number;
  lm_top_p?: number;
  lm_negative_prompt?: string;
};

type ExtractMetadata = {
  bpm?: number;
  key?: string;
  timesignature?: string;
  caption?: string;
  language?: string;
};

type TrackJob = {
  id: string | null;
  status: "idle" | "queued" | "generating" | "complete" | "failed";
  position: number;
  audioUrl: string | null;
  audioBlob: Blob | null;
  error: string | null;
  saved: boolean;
  extractMetadata?: ExtractMetadata;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const VIBES = ["Chill", "Hype", "Sad", "Romantic", "Epic", "Fun", "Dark", "Dreamy"] as const;

type LanguageOption = { label: string; value: string; experimental?: boolean };

const LANGUAGES: LanguageOption[] = [
  { label: "Auto", value: "auto" },
  { label: "English", value: "en" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "Japanese", value: "ja" },
  { label: "Korean", value: "ko" },
  { label: "Chinese", value: "zh" },
  { label: "Hindi", value: "hi", experimental: true },
  { label: "Portuguese", value: "pt" },
  { label: "German", value: "de" },
  { label: "Arabic", value: "ar", experimental: true },
  { label: "Italian", value: "it" },
  { label: "Russian", value: "ru" },
  { label: "Thai", value: "th", experimental: true },
  { label: "Vietnamese", value: "vi", experimental: true },
  { label: "Turkish", value: "tr", experimental: true },
];

const DEFAULT_TRACK: TrackDraft = {
  caption: "",
  lyrics: "",
  duration: 30,
  instrumental: false,
};

// ─── Page Component ─────────────────────────────────────────────────────────

export default function HomePage() {
  // Core state machine
  const [state, setState] = useState<AppState>("compose");
  const [taskType, setTaskType] = useState<TaskType>("text2music");

  // Audio upload state
  const [uploadedAudioPath, setUploadedAudioPath] = useState<string | null>(null);
  const [uploadedAudioName, setUploadedAudioName] = useState("");

  // Generation params
  const [audioFormat, setAudioFormat] = useState<"mp3" | "flac" | "wav">("mp3");
  const [repaintStart, setRepaintStart] = useState(0);
  const [repaintEnd, setRepaintEnd] = useState(-1);
  const [coverStrength, setCoverStrength] = useState(1.0);

  // Extract results
  const [extractResult, setExtractResult] = useState<ExtractMetadata | null>(null);

  // Shared form state
  const [duration, setDuration] = useState(30);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [contrastLevel, setContrastLevel] = useState<ContrastLevel>("balanced");
  const [altLyrics, setAltLyrics] = useState(true);

  // Smart mode state
  const [smartPrompt, setSmartPrompt] = useState("");
  const smartPromptRef = useRef(smartPrompt);
  const [vibe, setVibe] = useState<string | null>(null);
  const [lyricsDensity, setLyricsDensity] = useState<LyricsDensity>("moderate");
  const [autoSave, setAutoSave] = useState(true);
  const [voiceGender, setVoiceGender] = useState<VoiceGender>("auto");

  // Audio task state
  const [caption, setCaption] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [vocalLanguage, setVocalLanguage] = useState("auto");

  // Drafts and jobs
  const [previewTracks, setPreviewTracks] = useState<TrackDraft[]>([
    { ...DEFAULT_TRACK },
    { ...DEFAULT_TRACK },
  ]);
  const [trackJobs, setTrackJobs] = useState<TrackJob[]>([
    { id: null, status: "idle", position: 0, audioUrl: null, audioBlob: null, error: null, saved: false },
    { id: null, status: "idle", position: 0, audioUrl: null, audioBlob: null, error: null, saved: false },
  ]);
  const trackJobsRef = useRef<TrackJob[]>(trackJobs);
  const previewTracksRef = useRef<TrackDraft[]>(previewTracks);
  const autoSaveRef = useRef(autoSave);

  const [error, setError] = useState<string | null>(null);
  const [longerDuration, setLongerDuration] = useState(60);

  // Refs
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Helpers ────────────────────────────────────────────────────────────

  const buildContrastCaption = (base: string) => {
    const instructions: Record<ContrastLevel, string> = {
      subtle: "VARIATION: Shift to a softer, more intimate arrangement. Reduce tempo by 10-15 BPM. Swap electric instruments for acoustic equivalents. Add warm, mellow textures. Keep the emotional core but make it gentler.",
      balanced: "VARIATION: Transform the production style completely. If electronic, make it organic and acoustic. If acoustic, add synthesizers and electronic beats. Change the tempo feel significantly. Swap the main melodic instruments. Shift the era aesthetic (modern to vintage or vice versa).",
      bold: "COMPLETE REIMAGINING: Opposite genre entirely. If it was upbeat, make it a slow ballad. If it was electronic, make it folk or orchestral. If it was intimate, make it anthemic and huge. Different instruments, different tempo, different energy, different era. Only keep the core emotional theme.",
    };
    return `${base}\n\n${instructions[contrastLevel]}`;
  };

  const makeDraft = (
    captionValue: string,
    lyricsValue: string,
    durationValue: number,
    instrumentalValue: boolean,
    overrides?: Partial<TrackDraft>
  ): TrackDraft => {
    // Voice gender safety net: if caption doesn't mention the gender, append it
    let finalCaption = captionValue;
    if (voiceGender !== "auto" && !instrumentalValue) {
      const genderKeyword = `${voiceGender} vocal`;
      if (!finalCaption.toLowerCase().includes(genderKeyword)) {
        finalCaption = `${finalCaption}, ${genderKeyword}`;
      }
    }

    return {
      caption: finalCaption,
      lyrics: lyricsValue,
      duration: durationValue,
      instrumental: instrumentalValue,
      vocal_language: vocalLanguage === "auto" ? undefined : vocalLanguage,
      audio_format: audioFormat,
      ...overrides,
    };
  };

  // ─── Polling ────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (ids: string[]) => {
      stopPolling();
      console.log("%c[RIFF] Polling started", "color: #6366f1; font-weight: bold", "job_ids:", ids);
      let pollCount = 0;

      const poll = async () => {
        try {
          pollCount++;
          const updates = await Promise.all(
            ids.map(async (id) => {
              const res = await fetch(`/api/generate?job_id=${id}`);
              if (!res.ok) return { id, status: "failed" as const, error: "Status error" };
              const data = await res.json();
              return { id, ...data };
            })
          );

          const statuses = updates.map((u) => `${u.id?.substring(0, 8)}=${u.status}`).join(", ");
          console.log(`%c[RIFF] Poll #${pollCount}`, "color: #6366f1", statuses);

          const currentJobs = trackJobsRef.current;
          const nextJobs = currentJobs.map<TrackJob>((job) => {
            const update = updates.find((item) => item.id === job.id);
            if (!update) return job;

            if (update.status === "complete") {
              return { ...job, status: "complete", position: 0, error: null, extractMetadata: update.extract_metadata || undefined };
            }
            if (update.status === "failed") {
              return { ...job, status: "failed", error: update.error || "Generation failed" };
            }
            if (update.status === "generating") {
              return { ...job, status: "generating", position: 0 };
            }
            if (update.status === "queued") {
              return { ...job, status: "queued", position: update.position ?? 1 };
            }
            return job;
          });

          setTrackJobs(nextJobs);

          await Promise.all(
            nextJobs.map(async (job, index) => {
              if (job.status !== "complete" || job.audioUrl || !job.id) return;
              if (job.extractMetadata) {
                setExtractResult(job.extractMetadata);
                return;
              }
              const audioRes = await fetch(`/api/audio?job_id=${job.id}`);
              if (audioRes.ok) {
                const blob = await audioRes.blob();
                const url = URL.createObjectURL(blob);
                setTrackJobs((prev) =>
                  prev.map((item, idx) =>
                    idx === index ? { ...item, audioUrl: url, audioBlob: blob } : item
                  )
                );

                if (autoSaveRef.current) {
                  const trackMeta = previewTracksRef.current[index];
                  if (trackMeta) {
                    try {
                      await saveTrack({
                        id: job.id,
                        title: makeTitle(trackMeta.caption),
                        prompt: smartPromptRef.current,
                        caption: trackMeta.caption,
                        lyrics: trackMeta.lyrics,
                        duration: trackMeta.duration,
                        createdAt: Date.now(),
                        audio: blob,
                      });
                      setTrackJobs((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, saved: true } : item
                        )
                      );
                    } catch {
                      // ignore local save errors
                    }
                  }
                }
              }
            })
          );

          const allComplete = nextJobs.every((job) => job.status === "complete");
          const anyFailed = nextJobs.some((job) => job.status === "failed");
          const anyGenerating = nextJobs.some((job) => job.status === "generating");
          const anyQueued = nextJobs.some((job) => job.status === "queued");

          if (allComplete) {
            console.log("%c[RIFF] All tracks complete!", "color: #10b981; font-weight: bold; font-size: 14px");
            stopPolling();
            setState("player");
            return;
          }

          if (anyFailed) {
            const failedJobs = nextJobs.filter((j) => j.status === "failed");
            console.error("[RIFF] Track(s) failed:", failedJobs.map((j) => ({ id: j.id, error: j.error })));
            stopPolling();
            setError("One of the tracks failed to generate.");
            setState("compose");
            return;
          }

          if (anyGenerating) {
            setState("generating");
          } else if (anyQueued) {
            setState("queued");
          }
        } catch {
          // Silently retry on network errors
        }

        pollRef.current = setTimeout(poll, 2000);
      };

      poll();
    },
    [stopPolling]
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  useEffect(() => { trackJobsRef.current = trackJobs; }, [trackJobs]);
  useEffect(() => { previewTracksRef.current = previewTracks; }, [previewTracks]);
  useEffect(() => { autoSaveRef.current = autoSave; }, [autoSave]);
  useEffect(() => { smartPromptRef.current = smartPrompt; }, [smartPrompt]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const generateLyrics = useCallback(
    async (opts: {
      prompt: string;
      vibe?: string | null;
      lyricsDensity?: LyricsDensity;
      duration?: number;
      variant?: "alternate";
      baseLyrics?: string;
      baseCaption?: string;
      contrast?: ContrastLevel;
      language?: string;
      voiceGender?: VoiceGender;
    }) => {
      const payload = {
        prompt: opts.prompt,
        vibe: opts.vibe || undefined,
        lyricsDensity: opts.lyricsDensity,
        duration: opts.duration,
        variant: opts.variant,
        baseLyrics: opts.baseLyrics,
        baseCaption: opts.baseCaption,
        contrast: opts.contrast,
        language: opts.language,
        voiceGender: opts.voiceGender,
      };
      console.group(`%c[RIFF] generateLyrics (${opts.variant || "primary"})`, "color: #f59e0b; font-weight: bold");
      console.log("Request payload:", payload);
      console.groupEnd();

      const res = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate lyrics");
      }
      const result = await res.json();

      console.group(`%c[RIFF] Lyrics API response (${opts.variant || "primary"})`, "color: #10b981; font-weight: bold");
      console.log("Caption:", result.caption);
      console.log("Lyrics:", result.lyrics);
      if (result._debug) {
        console.group("LLM Debug");
        console.log("Model:", result._debug.model);
        console.log("Temperature:", result._debug.temperature);
        console.log("Vibe:", result._debug.vibe);
        console.log("Density:", result._debug.lyricsDensity);
        console.log("Variant:", result._debug.variant);
        console.log("Contrast:", result._debug.contrast);
        console.log("System prompt:", result._debug.systemPrompt);
        console.log("User prompt:", result._debug.userPrompt);
        console.log("Raw LLM response:", result._debug.rawResponse);
        console.groupEnd();
      }
      console.groupEnd();

      return result;
    },
    []
  );

  const submitTracks = useCallback(
    async (tracks: TrackDraft[]) => {
      setState("queued");
      setError(null);

      console.group("%c[RIFF] Submit Tracks to GPU", "color: #ef4444; font-weight: bold; font-size: 14px");

      const submissions = await Promise.allSettled(
        tracks.map(async (track, idx) => {
          const payload = {
            caption: track.caption,
            lyrics: track.instrumental ? "[Instrumental]" : track.lyrics,
            duration: track.duration,
            instrumental: track.instrumental,
            bpm: track.bpm ? parseInt(track.bpm, 10) : null,
            keyscale: track.keyscale || null,
            timesignature: track.timesignature || null,
            vocal_language: track.vocal_language || null,
            seed: track.seed ? parseInt(track.seed, 10) : null,
            task_type: track.task_type || "text2music",
            src_audio_path: track.src_audio_path || null,
            reference_audio_path: track.reference_audio_path || null,
            inference_steps: track.inference_steps ?? 8,
            thinking: track.thinking ?? true,
            infer_method: track.infer_method ?? "ode",
            shift: track.shift ?? 3.0,
            guidance_scale: track.guidance_scale ?? 7.0,
            audio_format: track.audio_format ?? "mp3",
            repainting_start: track.repainting_start ?? 0,
            repainting_end: track.repainting_end ?? -1,
            audio_cover_strength: track.audio_cover_strength ?? 1.0,
            use_cot_metas: track.use_cot_metas ?? true,
            use_cot_caption: track.use_cot_caption ?? true,
            use_cot_language: track.use_cot_language ?? true,
            lm_temperature: track.lm_temperature ?? 0.85,
            lm_cfg_scale: track.lm_cfg_scale ?? 2.0,
            lm_top_k: track.lm_top_k ?? 0,
            lm_top_p: track.lm_top_p ?? 0.9,
            lm_negative_prompt: track.lm_negative_prompt || null,
          };
          console.group(`Track ${idx === 0 ? "A" : "B"} → /api/generate`);
          console.log("Task:", payload.task_type);
          console.log("Caption:", payload.caption);
          console.log("Duration:", payload.duration, "s");
          console.log("Format:", payload.audio_format);
          console.log("Seed:", payload.seed);
          console.groupEnd();

          const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Failed to submit");
          }
          const result = await res.json();
          console.log(`Track ${idx === 0 ? "A" : "B"} submitted — job_id: ${result.job_id}`);
          if (result._debug) {
            console.log(`Track ${idx === 0 ? "A" : "B"} Modal payload:`, result._debug.payload);
          }
          return result;
        })
      );
      console.groupEnd();

      const nextJobs: TrackJob[] = submissions.map((result) => {
        if (result.status === "fulfilled") {
          return {
            id: result.value.job_id,
            status: "queued",
            position: result.value.position ?? 1,
            audioUrl: null,
            audioBlob: null,
            error: null,
            saved: false,
          };
        }
        return {
          id: null,
          status: "failed",
          position: 0,
          audioUrl: null,
          audioBlob: null,
          error: result.reason?.message || "Failed to submit",
          saved: false,
        };
      });

      setTrackJobs(nextJobs);

      const validIds = nextJobs.map((job) => job.id).filter(Boolean) as string[];
      const hasFailure = nextJobs.some((job) => job.status === "failed");
      if (hasFailure) {
        await Promise.all(
          validIds.map((id) =>
            fetch(`/api/generate?job_id=${id}&cancel=1`).catch(() => {})
          )
        );
        setState("compose");
        setError("Failed to submit both tracks. Please try again.");
        return;
      }

      if (validIds.length > 0) {
        startPolling(validIds);
        return;
      }

      setState("compose");
      setError("Failed to submit generation request.");
    },
    [startPolling]
  );

  useEffect(() => {
    setLongerDuration(Math.min(duration + 30, 600));
  }, [duration]);

  const handleSmartGenerate = async () => {
    setError(null);
    const prompt = smartPrompt.trim();
    if (!prompt) {
      setError("Please describe the music you want");
      return;
    }

    console.group("%c[RIFF] Smart Generate", "color: #8b5cf6; font-weight: bold; font-size: 14px");
    console.log("Prompt:", prompt);
    console.log("Vibe:", vibe);
    console.log("Voice:", voiceGender);
    console.log("Instrumental:", isInstrumental);
    console.log("Lyrics density:", lyricsDensity);
    console.log("Contrast level:", contrastLevel);
    console.log("Alt lyrics:", altLyrics);
    console.log("Duration:", duration);

    if (isInstrumental) {
      const draftA = makeDraft(prompt, "[Instrumental]", duration, true);
      const contrastCaption = buildContrastCaption(prompt);
      const draftB = makeDraft(contrastCaption, "[Instrumental]", duration, true);
      setPreviewTracks([draftA, draftB]);
      console.groupEnd();
      setState("preview-lyrics");
      return;
    }

    setState("writing-lyrics");
    try {
      const lang = vocalLanguage === "auto" ? undefined : vocalLanguage;
      const primary = await generateLyrics({
        prompt,
        vibe,
        lyricsDensity,
        duration,
        language: lang,
        voiceGender: voiceGender !== "auto" ? voiceGender : undefined,
      });

      const finalDuration = primary.duration || duration;

      let secondary;
      if (altLyrics) {
        secondary = await generateLyrics({
          prompt,
          vibe,
          lyricsDensity,
          duration,
          variant: "alternate",
          baseLyrics: primary.lyrics,
          baseCaption: primary.caption,
          contrast: contrastLevel,
          language: lang,
          voiceGender: voiceGender !== "auto" ? voiceGender : undefined,
        });
      } else {
        const contrastCaption = buildContrastCaption(primary.caption);
        secondary = { ...primary, caption: contrastCaption };
      }

      const draftA = makeDraft(primary.caption, primary.lyrics, finalDuration, false);
      const draftB = makeDraft(
        secondary.caption,
        altLyrics ? secondary.lyrics : primary.lyrics,
        secondary.duration || finalDuration,
        false
      );

      console.groupEnd();

      setDuration(finalDuration);
      setPreviewTracks([draftA, draftB]);
      setState("preview-lyrics");
    } catch (err) {
      console.error("Smart generate failed:", err);
      console.groupEnd();
      setError(err instanceof Error ? err.message : "Failed to generate lyrics");
      setState("compose");
    }
  };

  const handlePreviewGenerate = async () => {
    setError(null);
    await submitTracks(previewTracks);
  };

  const handleGenerateLonger = async () => {
    const nextDuration = Math.min(Math.max(longerDuration, 10), 600);
    const updatedTracks = previewTracksRef.current.map((track) => ({
      ...track,
      duration: nextDuration,
    }));
    setPreviewTracks(updatedTracks);
    await submitTracks(updatedTracks);
  };

  const handleRegenerateTrack = async (index: number) => {
    const track = previewTracksRef.current[index];
    if (!track) return;

    setError(null);
    setState("queued");

    const payload = {
      caption: track.caption,
      lyrics: track.instrumental ? "[Instrumental]" : track.lyrics,
      duration: track.duration,
      instrumental: track.instrumental,
      bpm: track.bpm ? parseInt(track.bpm, 10) : null,
      keyscale: track.keyscale || null,
      timesignature: track.timesignature || null,
      vocal_language: track.vocal_language || null,
      task_type: track.task_type || "text2music",
      src_audio_path: track.src_audio_path || null,
      reference_audio_path: track.reference_audio_path || null,
      inference_steps: track.inference_steps ?? 8,
      thinking: track.thinking ?? true,
      infer_method: track.infer_method ?? "ode",
      shift: track.shift ?? 3.0,
      guidance_scale: track.guidance_scale ?? 7.0,
      audio_format: track.audio_format ?? "mp3",
      repainting_start: track.repainting_start ?? 0,
      repainting_end: track.repainting_end ?? -1,
      audio_cover_strength: track.audio_cover_strength ?? 1.0,
      use_cot_metas: track.use_cot_metas ?? true,
      use_cot_caption: track.use_cot_caption ?? true,
      use_cot_language: track.use_cot_language ?? true,
      lm_temperature: track.lm_temperature ?? 0.85,
      lm_cfg_scale: track.lm_cfg_scale ?? 2.0,
      lm_top_k: track.lm_top_k ?? 0,
      lm_top_p: track.lm_top_p ?? 0.9,
      lm_negative_prompt: track.lm_negative_prompt || null,
      seed: null,
    };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit");
      }
      const data = await res.json();

      setTrackJobs((prev) =>
        prev.map((job, idx) =>
          idx === index
            ? { id: data.job_id, status: "queued", position: data.position ?? 1, audioUrl: null, audioBlob: null, error: null, saved: false }
            : job
        )
      );

      const nextIds = trackJobsRef.current
        .map((job, idx) => (idx === index ? data.job_id : job.id))
        .filter(Boolean) as string[];

      if (nextIds.length > 0) {
        startPolling(nextIds);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
      setState("compose");
    }
  };

  const handleSaveTrack = async (index: number) => {
    const job = trackJobsRef.current[index];
    const meta = previewTracksRef.current[index];
    if (!job?.audioBlob || !job.id || !meta) return;
    try {
      await saveTrack({
        id: job.id,
        title: makeTitle(meta.caption),
        prompt: smartPrompt,
        caption: meta.caption,
        lyrics: meta.lyrics,
        duration: meta.duration,
        createdAt: Date.now(),
        audio: job.audioBlob,
      });
      setTrackJobs((prev) =>
        prev.map((item, idx) => (idx === index ? { ...item, saved: true } : item))
      );
    } catch {
      setError("Failed to save track locally.");
    }
  };

  const extractSection = (text: string, section: string) => {
    const pattern = new RegExp(`\\[${section}\\]([\\s\\S]*?)(?=\\n\\[|$)`, "i");
    const match = text.match(pattern);
    return match ? match[0].trim() : null;
  };

  const replaceSection = (original: string, section: string, replacement: string) => {
    const pattern = new RegExp(`\\[${section}\\]([\\s\\S]*?)(?=\\n\\[|$)`, "i");
    if (!pattern.test(original)) {
      return `${original.trim()}\\n\\n${replacement.trim()}`.trim();
    }
    return original.replace(pattern, replacement.trim());
  };

  const handleRewriteChorus = async (index: number) => {
    const track = previewTracksRef.current[index];
    if (!track || track.instrumental) return;
    setError(null);
    setState("writing-lyrics");
    try {
      const rewriteLang = vocalLanguage === "auto" ? undefined : vocalLanguage;
      const response = await generateLyrics({
        prompt: `Rewrite only the chorus for this song. Return full lyrics with section markers.`,
        duration: track.duration,
        variant: "alternate",
        baseLyrics: track.lyrics,
        baseCaption: track.caption,
        contrast: contrastLevel,
        language: rewriteLang,
      });
      const newChorus = extractSection(response.lyrics, "Chorus");
      const updatedLyrics = newChorus
        ? replaceSection(track.lyrics, "Chorus", newChorus)
        : response.lyrics;
      setPreviewTracks((prev) =>
        prev.map((item, idx) =>
          idx === index ? { ...item, lyrics: updatedLyrics } : item
        )
      );
      setState("preview-lyrics");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rewrite chorus");
      setState("preview-lyrics");
    }
  };

  const handleReset = () => {
    trackJobs.forEach((job) => {
      if (job.audioUrl) URL.revokeObjectURL(job.audioUrl);
    });
    setTrackJobs([
      { id: null, status: "idle", position: 0, audioUrl: null, audioBlob: null, error: null, saved: false },
      { id: null, status: "idle", position: 0, audioUrl: null, audioBlob: null, error: null, saved: false },
    ]);
    setPreviewTracks([{ ...DEFAULT_TRACK }, { ...DEFAULT_TRACK }]);
    setSmartPrompt("");
    setCaption("");
    setLyrics("");
    setVibe(null);
    setIsInstrumental(false);
    setLyricsDensity("moderate");
    setAutoSave(true);
    setVoiceGender("auto");
    setVocalLanguage("auto");
    setUploadedAudioPath(null);
    setUploadedAudioName("");
    setAudioFormat("mp3");
    setRepaintStart(0);
    setRepaintEnd(-1);
    setCoverStrength(1.0);
    setExtractResult(null);
    setError(null);
    setState("compose");
  };

  const handleCancel = async () => {
    stopPolling();
    await Promise.all(
      trackJobs
        .map((job) => job.id)
        .filter(Boolean)
        .map((id) => fetch(`/api/generate?job_id=${id}&cancel=1`).catch(() => {}))
    );
    setTrackJobs([
      { id: null, status: "idle", position: 0, audioUrl: null, audioBlob: null, error: null, saved: false },
      { id: null, status: "idle", position: 0, audioUrl: null, audioBlob: null, error: null, saved: false },
    ]);
    setState("compose");
  };

  const handleBackFromPreview = () => {
    setState("compose");
  };

  const handleAudioTaskGenerate = async () => {
    setError(null);
    if (!uploadedAudioPath) {
      setError("Please upload an audio file first");
      return;
    }

    const baseCaption = caption.trim() || "music";

    if (taskType === "extract") {
      setExtractResult(null);
      const draft: TrackDraft = makeDraft(baseCaption, "[Instrumental]", duration, true, {
        task_type: "extract",
        src_audio_path: uploadedAudioPath,
      });
      setPreviewTracks([draft]);
      setTrackJobs([
        { id: null, status: "idle", position: 0, audioUrl: null, audioBlob: null, error: null, saved: false },
      ]);
      await submitTracks([draft]);
      return;
    }

    const overrides: Partial<TrackDraft> = {
      task_type: taskType,
      src_audio_path: uploadedAudioPath,
    };

    if (taskType === "cover") {
      overrides.audio_cover_strength = coverStrength;
    }
    if (taskType === "repaint") {
      overrides.repainting_start = repaintStart;
      overrides.repainting_end = repaintEnd;
    }

    const draft: TrackDraft = makeDraft(
      baseCaption,
      lyrics.trim() || "[Instrumental]",
      duration,
      isInstrumental || !lyrics.trim(),
      overrides,
    );
    setPreviewTracks([draft]);
    setTrackJobs([
      { id: null, status: "idle", position: 0, audioUrl: null, audioBlob: null, error: null, saved: false },
    ]);
    await submitTracks([draft]);
  };

  const handleCopyExtractToCreate = () => {
    if (!extractResult) return;
    setSmartPrompt(extractResult.caption || "");
    setState("compose");
    setExtractResult(null);
  };

  const canSmartGenerate = smartPrompt.trim().length > 0;
  const canAudioTaskGenerate = !!uploadedAudioPath && (taskType === "extract" || caption.trim().length > 0);

  const anyQueued = trackJobs.some((job) => job.status === "queued");
  const anyGenerating = trackJobs.some((job) => job.status === "generating");

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button type="button" onClick={handleReset} className="flex items-center gap-3 cursor-pointer">
            <div className="size-11 rounded-xl bg-accent text-white flex items-center justify-center shadow-[0_2px_8px_rgba(249,115,22,0.25)]">
              <Logo showText={false} className="text-white" />
            </div>
            <div className="text-left">
              <div className="text-lg font-semibold font-display">Riff</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">OPEN-SOURCE MUSIC GENERATOR</div>
            </div>
          </button>
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/library"
              className="font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Library
            </Link>
            <a
              href="https://github.com/ace-step/ACE-Step-1.5"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-3xl space-y-8">
          {/* Hero */}
          <div className="text-center space-y-3">
            {state === "compose" && (
              <div className="inline-flex items-center gap-2 rounded-full bg-white/60 border border-black/10 px-4 py-1.5 text-xs text-muted-foreground">
                100% free &middot; open-source &middot; saved locally
              </div>
            )}
            <h1 className="text-[1.875rem] font-display tracking-tight text-balance leading-[1.2]">
              {state === "player"
                ? extractResult ? "Analysis complete" : previewTracks.length === 1 ? "Your track is ready" : "Your two tracks are ready"
                : state === "preview-lyrics"
                ? "Review your tracks"
                : state === "compose"
                ? "Describe the music in your head"
                : ""}
            </h1>
            {state === "compose" && (
              <p className="text-[15px] text-muted-foreground text-pretty">
                We generate two distinct takes every time — pick the one you love.
              </p>
            )}
          </div>

          {/* ─── Player State ─── */}
          {state === "player" ? (
            <div className="space-y-6">
              {extractResult ? (
                <div className="glass-elevated rounded-3xl p-7 space-y-5">
                  <div className="text-xs font-bold text-accent uppercase tracking-widest">Extracted Metadata</div>
                  <div className="grid grid-cols-2 gap-4">
                    {extractResult.bpm && (
                      <div className="glass-subtle rounded-xl p-4 space-y-1">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">BPM</div>
                        <div className="text-lg font-semibold font-display">{extractResult.bpm}</div>
                      </div>
                    )}
                    {extractResult.key && (
                      <div className="glass-subtle rounded-xl p-4 space-y-1">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Key</div>
                        <div className="text-lg font-semibold font-display">{extractResult.key}</div>
                      </div>
                    )}
                    {extractResult.timesignature && (
                      <div className="glass-subtle rounded-xl p-4 space-y-1">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Time Signature</div>
                        <div className="text-lg font-semibold font-display">
                          {extractResult.timesignature === "4" ? "4/4" : extractResult.timesignature === "3" ? "3/4" : extractResult.timesignature === "6" ? "6/8" : extractResult.timesignature}
                        </div>
                      </div>
                    )}
                    {extractResult.language && (
                      <div className="glass-subtle rounded-xl p-4 space-y-1">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Language</div>
                        <div className="text-lg font-semibold font-display">{extractResult.language}</div>
                      </div>
                    )}
                  </div>
                  {extractResult.caption && (
                    <div className="glass-subtle rounded-xl p-4 space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Caption</div>
                      <div className="text-sm text-foreground">{extractResult.caption}</div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={handleCopyExtractToCreate} className="flex-1 rounded-xl px-4 py-3 btn-primary text-white font-semibold text-sm">
                      Use as prompt
                    </button>
                    <button type="button" onClick={handleReset} className="flex-1 rounded-xl px-4 py-3 glass glass-hover text-muted-foreground font-medium text-sm">
                      Start fresh
                    </button>
                  </div>
                </div>
              ) : (
                <div className={cn("grid gap-6", trackJobs.length > 1 ? "md:grid-cols-2" : "max-w-lg mx-auto")}>
                  {trackJobs.map((job, index) => (
                    <div key={index} className={`glass-elevated rounded-3xl p-7 space-y-4 border-t-2 ${index === 0 ? "border-t-accent" : "border-t-violet-400"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`size-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${index === 0 ? "bg-accent" : "bg-violet-400"}`}>
                            {index === 0 ? "A" : "B"}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Track {index === 0 ? "A" : "B"}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {index === 0 ? "Primary take" : "Alternate take"}
                        </span>
                      </div>
                      {job.audioUrl ? (
                        <AudioPlayer src={job.audioUrl} />
                      ) : (
                        <p className="text-sm text-muted-foreground">Audio unavailable.</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <button type="button" onClick={() => handleRegenerateTrack(index)} className="px-3 py-1.5 rounded-full glass glass-hover transition-colors">
                          Retake
                        </button>
                        {!job.saved && (
                          <button type="button" onClick={() => handleSaveTrack(index)} className="px-3 py-1.5 rounded-full glass glass-hover transition-colors">
                            Save to Library
                          </button>
                        )}
                        {job.saved && <span className="px-3 py-1.5 rounded-full glass">Saved</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next steps</div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="glass-subtle rounded-xl p-4 space-y-3">
                    <div className="text-sm font-semibold">Extend duration</div>
                    <p className="text-xs text-muted-foreground">Generate a longer version of these tracks.</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Duration</span>
                      <span className="font-mono tabular-nums">{longerDuration}s</span>
                    </div>
                    <input type="range" min={10} max={600} step={5} value={longerDuration} onChange={(e) => setLongerDuration(parseInt(e.target.value, 10))} className="w-full" aria-label="Longer version duration" />
                    <button type="button" onClick={handleGenerateLonger} className="w-full rounded-xl px-3 py-2 btn-primary text-white text-sm font-semibold">
                      Extend
                    </button>
                  </div>
                  <div className="glass-subtle rounded-xl p-4 space-y-3">
                    <div className="text-sm font-semibold">Edit prompts</div>
                    <p className="text-xs text-muted-foreground">Tweak prompts or lyrics before regenerating both tracks.</p>
                    <button type="button" onClick={() => setState("preview-lyrics")} className="w-full rounded-xl px-3 py-2 glass glass-hover text-muted-foreground text-sm font-semibold">
                      Edit &amp; regenerate
                    </button>
                  </div>
                  <div className="glass-subtle rounded-xl p-4 space-y-3">
                    <div className="text-sm font-semibold">Start fresh</div>
                    <p className="text-xs text-muted-foreground">Clear everything and start with a new idea from scratch.</p>
                    <button type="button" onClick={handleReset} className="w-full rounded-xl px-3 py-2 glass glass-hover text-muted-foreground text-sm font-semibold">
                      New idea
                    </button>
                  </div>
                </div>
              </div>
            </div>

          ) : state === "queued" || state === "generating" ? (
            <div className="space-y-4">
              {anyGenerating && <GeneratingState />}
              {anyQueued && (
                <div className="glass-elevated rounded-3xl p-7 space-y-4">
                  <div className="text-sm font-medium">Queue status</div>
                  {trackJobs.map((job, index) => (
                    <div key={index} className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${
                          job.status === "generating" ? "bg-accent animate-pulse" :
                          job.status === "complete" ? "bg-emerald-500" :
                          "bg-muted-foreground/30"
                        }`} />
                        <span>Track {index === 0 ? "A" : "B"}</span>
                      </div>
                      <span>
                        {job.status === "queued"
                          ? `Queued #${job.position}`
                          : job.status === "generating"
                          ? "Generating"
                          : job.status === "complete"
                          ? "Complete"
                          : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={handleCancel} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2.5 rounded-xl glass glass-hover">
                Cancel
              </button>
            </div>

          ) : state === "writing-lyrics" ? (
            <WritingLyricsState />

          ) : state === "preview-lyrics" ? (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {previewTracks.map((track, index) => (
                  <div key={index} className={`glass-elevated rounded-3xl p-7 space-y-5 border-t-2 ${index === 0 ? "border-t-accent" : "border-t-violet-400"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`size-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${index === 0 ? "bg-accent" : "bg-violet-400"}`}>
                          {index === 0 ? "A" : "B"}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Track {index === 0 ? "A" : "B"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {index === 0 ? "Primary take" : "Alternate take"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Style</label>
                      <textarea
                        value={track.caption}
                        onChange={(e) =>
                          setPreviewTracks((prev) =>
                            prev.map((item, idx) =>
                              idx === index ? { ...item, caption: e.target.value } : item
                            )
                          )
                        }
                        rows={3}
                        className="w-full rounded-xl glass-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none"
                      />
                    </div>

                    {!track.instrumental && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lyrics</label>
                        <textarea
                          value={track.lyrics}
                          onChange={(e) =>
                            setPreviewTracks((prev) =>
                              prev.map((item, idx) =>
                                idx === index ? { ...item, lyrics: e.target.value } : item
                              )
                            )
                          }
                          rows={10}
                          maxLength={4096}
                          className="w-full rounded-xl glass-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 font-mono resize-none focus:outline-none"
                        />
                        <div className="flex items-center justify-between">
                          <button type="button" onClick={() => handleRewriteChorus(index)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            Rewrite chorus
                          </button>
                          <span className="text-[10px] text-muted-foreground/50 font-mono tabular-nums">
                            {track.lyrics.length} / 4096
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Duration</span>
                      <span className="font-mono tabular-nums">{track.duration}s</span>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5">{error}</p>
              )}

              <div className="flex gap-3">
                <button onClick={handleBackFromPreview} className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 glass glass-hover text-muted-foreground font-medium text-sm transition-colors hover:text-foreground">
                  Back
                </button>
                <button onClick={handlePreviewGenerate} className="flex-[2] flex items-center justify-center gap-2 rounded-xl px-6 py-3 btn-primary text-white font-semibold text-base">
                  Generate Both Tracks
                </button>
              </div>
            </div>

          ) : (
            /* ─── Compose State ─── */
            <div className="space-y-5">
              {/* Main compose card */}
              <div className="glass-elevated rounded-3xl p-7 space-y-6">
                {/* Vibe pills */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vibe</label>
                  <div className="flex flex-wrap gap-2">
                    {VIBES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVibe(vibe === v ? null : v)}
                        className={cn("glass-chip", vibe === v && "selected")}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text prompt */}
                <div className="space-y-2">
                  <label htmlFor="smart-prompt" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    What kind of song do you want?
                  </label>
                  <textarea
                    id="smart-prompt"
                    value={smartPrompt}
                    onChange={(e) => setSmartPrompt(e.target.value)}
                    placeholder="e.g. A love song for Valentine's Day, upbeat and fun with warm vocals"
                    rows={4}
                    maxLength={1000}
                    className="w-full rounded-xl glass-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none"
                  />
                </div>

                {/* Vocal / Instrumental toggle */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</label>
                  <div className="glass-pill flex">
                    <button type="button" onClick={() => setIsInstrumental(false)} className={cn("glass-pill-segment flex-1 text-center", !isInstrumental && "active")}>
                      Vocal
                    </button>
                    <button type="button" onClick={() => setIsInstrumental(true)} className={cn("glass-pill-segment flex-1 text-center", isInstrumental && "active")}>
                      Instrumental
                    </button>
                  </div>
                </div>

                {/* Voice gender (vocal only) */}
                {!isInstrumental && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Voice</label>
                    <div className="glass-pill flex">
                      {(["auto", "male", "female"] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setVoiceGender(g)}
                          className={cn("glass-pill-segment flex-1 text-center capitalize", voiceGender === g && "active")}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Language (vocal only) */}
                {!isInstrumental && (
                  <div className="space-y-1">
                    <label htmlFor="smart-vocal-language" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Language
                    </label>
                    <select
                      id="smart-vocal-language"
                      value={vocalLanguage}
                      onChange={(e) => setVocalLanguage(e.target.value)}
                      className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-foreground bg-transparent focus:outline-none appearance-none cursor-pointer"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.value} value={lang.value} className="bg-white">
                          {lang.label}{lang.experimental ? " (experimental)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Duration */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</label>
                    <span className="text-sm font-mono text-foreground tabular-nums">{duration}s</span>
                  </div>
                  <input type="range" min={10} max={600} step={5} value={duration} onChange={(e) => setDuration(parseInt(e.target.value, 10))} className="w-full" aria-label="Duration in seconds" />
                  <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                    <span>10s</span>
                    <span>10min</span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5">{error}</p>
                )}

                {/* CTA */}
                <button
                  onClick={handleSmartGenerate}
                  disabled={!canSmartGenerate}
                  className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 btn-primary text-white font-semibold text-base"
                >
                  {isInstrumental ? "Generate Two Tracks" : "Write Lyrics & Preview"}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" /></svg>
                </button>

                {/* ─── Advanced accordion ─── */}
                <details className="group">
                  <summary className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="transition-transform group-open:rotate-90">
                      <path d="M4.5 2.5l4 3.5-4 3.5" />
                    </svg>
                    <span className="uppercase tracking-wide">Advanced</span>
                  </summary>
                  <div className="glass-subtle rounded-xl p-4 mt-3 space-y-5">
                    {/* Lyrics density (vocal only) */}
                    {!isInstrumental && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">How many lyrics?</label>
                        <div className="glass-pill flex">
                          {([["light", "Sparse"], ["moderate", "Standard"], ["heavy", "Dense"]] as const).map(([value, label]) => (
                            <button key={value} type="button" onClick={() => setLyricsDensity(value)} className={cn("glass-pill-segment flex-1 text-center", lyricsDensity === value && "active")}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audio format */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Audio format</label>
                      <div className="glass-pill flex">
                        {(["mp3", "flac", "wav"] as const).map((fmt) => (
                          <button key={fmt} type="button" onClick={() => setAudioFormat(fmt)} className={cn("glass-pill-segment flex-1 text-center uppercase", audioFormat === fmt && "active")}>
                            {fmt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Two-track variation */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">How different should Track B be?</label>
                      <div className="glass-pill flex">
                        {([["subtle", "Similar"], ["balanced", "Different"], ["bold", "Very different"]] as const).map(([value, label]) => (
                          <button key={value} type="button" onClick={() => setContrastLevel(value)} className={cn("glass-pill-segment flex-1 text-center", contrastLevel === value && "active")}>
                            {label}
                          </button>
                        ))}
                      </div>
                      {!isInstrumental && (
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <input type="checkbox" checked={altLyrics} onChange={(e) => setAltLyrics(e.target.checked)} />
                          Write unique lyrics for Track B
                        </label>
                      )}
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} />
                        Auto-save to Library
                      </label>
                    </div>

                    {/* ─── Audio Tasks accordion ─── */}
                    <details className="group/tasks">
                      <summary className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="transition-transform group-open/tasks:rotate-90">
                          <path d="M4.5 2.5l4 3.5-4 3.5" />
                        </svg>
                        <span className="uppercase tracking-wide">Audio Tasks</span>
                      </summary>
                      <div className="glass-subtle rounded-xl p-4 mt-3 space-y-5">
                        {/* Task type tabs */}
                        <div className="flex flex-wrap gap-2">
                          {([
                            ["cover", "Cover"],
                            ["repaint", "Repaint"],
                            ["complete", "Extend"],
                            ["extract", "Extract"],
                          ] as const).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setTaskType(value)}
                              className={cn("glass-chip px-4 py-1.5 text-sm", taskType === value && "selected")}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        {/* Audio upload */}
                        <AudioUpload
                          label="Source track"
                          description={
                            taskType === "extract" ? "Upload the track you want to analyze"
                            : taskType === "cover" ? "Upload the track you want to transform"
                            : taskType === "repaint" ? "Upload the track to edit a section of"
                            : "Upload the track you want to extend"
                          }
                          onUpload={(path, name) => { setUploadedAudioPath(path); setUploadedAudioName(name); }}
                          onRemove={() => { setUploadedAudioPath(null); setUploadedAudioName(""); }}
                          uploadedFileName={uploadedAudioName}
                        />

                        {/* Caption (not for extract) */}
                        {taskType !== "extract" && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {taskType === "cover" ? "Describe the new style" : taskType === "repaint" ? "Describe the edited section" : "Describe the extension"}
                            </label>
                            <textarea
                              value={caption}
                              onChange={(e) => setCaption(e.target.value)}
                              placeholder={
                                taskType === "cover" ? "e.g. Transform into a jazzy lo-fi version with warm piano..."
                                : taskType === "repaint" ? "e.g. Replace this section with an energetic guitar solo..."
                                : "e.g. Continue with a triumphant orchestral crescendo..."
                              }
                              rows={3}
                              maxLength={512}
                              className="w-full rounded-xl glass-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none"
                            />
                          </div>
                        )}

                        {/* Cover strength */}
                        {taskType === "cover" && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cover strength</label>
                              <span className="text-sm font-mono text-foreground tabular-nums">{coverStrength.toFixed(2)}</span>
                            </div>
                            <input type="range" min={0} max={1} step={0.05} value={coverStrength} onChange={(e) => setCoverStrength(parseFloat(e.target.value))} className="w-full" />
                            <div className="flex justify-between text-[10px] text-muted-foreground/50">
                              <span>More creative</span>
                              <span>More faithful</span>
                            </div>
                          </div>
                        )}

                        {/* Repaint time range */}
                        {taskType === "repaint" && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Time range (seconds)</label>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Start</label>
                                <input type="number" min={0} value={repaintStart} onChange={(e) => setRepaintStart(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-foreground focus:outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">End (-1 = end of file)</label>
                                <input type="number" min={-1} value={repaintEnd} onChange={(e) => setRepaintEnd(parseFloat(e.target.value) || -1)} className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-foreground focus:outline-none" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Generate button */}
                        <button
                          onClick={handleAudioTaskGenerate}
                          disabled={!canAudioTaskGenerate}
                          className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3 btn-primary text-white font-semibold text-sm"
                        >
                          {taskType === "extract" ? "Extract Metadata" : taskType === "cover" ? "Generate Cover" : taskType === "repaint" ? "Repaint Section" : "Extend Track"}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" /></svg>
                        </button>
                      </div>
                    </details>
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-16 border-t border-black/[0.04] mt-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pb-10 border-b border-black/5">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-accent text-white flex items-center justify-center">
                <Logo showText={false} className="text-white" />
              </div>
              <span className="font-semibold font-display text-foreground text-xl">
                Riff <span className="text-muted-foreground font-normal text-base ml-2">— Free &amp; open-source music generation</span>
              </span>
            </div>
            <div className="flex items-center gap-8 font-medium text-sm text-muted-foreground">
              <Link href="/library" className="hover:text-accent transition-colors">Library</Link>
              <a href="https://github.com/ace-step/ACE-Step-1.5" target="_blank" rel="noopener noreferrer" className="text-xl hover:text-foreground transition-colors" aria-label="GitHub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              </a>
            </div>
          </div>
          <div className="pt-8 text-center">
            <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest">
              Powered by ACE-Step. Open Source. MIT Licensed. &copy; 2025 Riff.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
