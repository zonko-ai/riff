"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { saveTrack, makeTitle } from "@/lib/library";
import { GenrePills } from "@/components/genre-pills";
import { AudioPlayer } from "@/components/audio-player";
import { GeneratingState } from "@/components/generating-state";
import { Logo } from "@/components/logo";

export default function CreatePage() {
  return (
    <Suspense>
      <CreatePageInner />
    </Suspense>
  );
}

type AppState =
  | "compose"
  | "writing-lyrics"
  | "preview-lyrics"
  | "queued"
  | "generating"
  | "player";

type Mode = "smart" | "pro";

type LyricsDensity = "light" | "moderate" | "heavy";

type ContrastLevel = "subtle" | "balanced" | "bold";

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
  // Advanced generation params
  inference_steps?: number;
  thinking?: boolean;
  infer_method?: string;
  lm_temperature?: number;
  lm_cfg_scale?: number;
  lm_top_k?: number;
  lm_top_p?: number;
  lm_negative_prompt?: string;
};

type TrackJob = {
  id: string | null;
  status: "idle" | "queued" | "generating" | "complete" | "failed";
  position: number;
  audioUrl: string | null;
  audioBlob: Blob | null;
  error: string | null;
  saved: boolean;
};

const VIBES = [
  "Chill",
  "Hype",
  "Sad",
  "Romantic",
  "Epic",
  "Fun",
  "Dark",
  "Dreamy",
] as const;

const MUSICAL_KEYS = [
  "C Major",
  "C minor",
  "D Major",
  "D minor",
  "Eb Major",
  "E Major",
  "E minor",
  "F Major",
  "F minor",
  "F# Major",
  "G Major",
  "G minor",
  "Ab Major",
  "A Major",
  "A minor",
  "Bb Major",
  "B Major",
  "B minor",
] as const;

type LanguageOption = {
  label: string;
  value: string;
  experimental?: boolean;
};

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

const SECTION_MARKERS = ["[Verse]", "[Chorus]", "[Bridge]", "[Outro]", "[Intro]"] as const;

const DEFAULT_TRACK: TrackDraft = {
  caption: "",
  lyrics: "",
  duration: 30,
  instrumental: false,
};

function CreatePageInner() {
  const searchParams = useSearchParams();
  // Core state machine
  const [state, setState] = useState<AppState>("compose");
  const [mode, setMode] = useState<Mode>("smart");

  // Shared form state
  const [duration, setDuration] = useState(30);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [contrastLevel, setContrastLevel] = useState<ContrastLevel>("balanced");
  const [altLyrics, setAltLyrics] = useState(true);

  // Smart mode state
  const [smartPrompt, setSmartPrompt] = useState("");
  const [vibe, setVibe] = useState<string | null>(null);
  const [lyricsDensity, setLyricsDensity] = useState<LyricsDensity>("moderate");
  const [autoSave, setAutoSave] = useState(true);

  // Pro mode state
  const [caption, setCaption] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [styleTags, setStyleTags] = useState("");
  const [negativeTags, setNegativeTags] = useState("");
  const [seed, setSeed] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genreSearch, setGenreSearch] = useState("");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [timeSignature, setTimeSignature] = useState("");
  const [vocalLanguage, setVocalLanguage] = useState("auto");
  const [showMusicalControls, setShowMusicalControls] = useState(false);
  const [showAdvancedGen, setShowAdvancedGen] = useState(false);
  const [inferenceSteps, setInferenceSteps] = useState(8);
  const [thinking, setThinking] = useState(true);
  const [inferMethod, setInferMethod] = useState("ode");
  const [lmTemperature, setLmTemperature] = useState(0.85);
  const [lmCfgScale, setLmCfgScale] = useState(2.0);
  const [lmTopK, setLmTopK] = useState(0);
  const [lmTopP, setLmTopP] = useState(0.9);
  const [lmNegativePrompt, setLmNegativePrompt] = useState("");

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
  const lyricsRef = useRef<HTMLTextAreaElement>(null);

  const parseSeed = (value: string) => {
    if (!value.trim()) return undefined;
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) ? number : undefined;
  };

  const buildCaptionWithTags = (base: string) => {
    let result = base.trim();
    const tags = styleTags.trim();
    const avoid = negativeTags.trim();
    if (tags) result += ` | Style tags: ${tags}`;
    if (avoid) result += ` | Avoid: ${avoid}`;
    return result;
  };

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
    seedValue?: number
  ): TrackDraft => ({
    caption: captionValue,
    lyrics: lyricsValue,
    duration: durationValue,
    instrumental: instrumentalValue,
    bpm: bpm || undefined,
    keyscale: musicalKey || undefined,
    timesignature: timeSignature || undefined,
    vocal_language: vocalLanguage === "auto" ? undefined : vocalLanguage,
    seed: seedValue !== undefined ? String(seedValue) : undefined,
    inference_steps: inferenceSteps,
    thinking,
    infer_method: inferMethod,
    lm_temperature: lmTemperature,
    lm_cfg_scale: lmCfgScale,
    lm_top_k: lmTopK,
    lm_top_p: lmTopP,
    lm_negative_prompt: lmNegativePrompt || undefined,
  });

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
              return {
                ...job,
                status: "complete",
                position: 0,
                error: null,
              };
            }

            if (update.status === "failed") {
              return {
                ...job,
                status: "failed",
                error: update.error || "Generation failed",
              };
            }

            if (update.status === "generating") {
              return { ...job, status: "generating", position: 0 };
            }

            if (update.status === "queued") {
              return {
                ...job,
                status: "queued",
                position: update.position || 0,
              };
            }

            return job;
          });

          setTrackJobs(nextJobs);

          await Promise.all(
            nextJobs.map(async (job, index) => {
              if (job.status !== "complete" || job.audioUrl || !job.id) return;
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
          const anyGenerating = nextJobs.some((job) => job.status === "generating");
          const anyQueued = nextJobs.some((job) => job.status === "queued");
          const anyFailed = nextJobs.some((job) => job.status === "failed");

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

        // Schedule next poll only after current one completes
        pollRef.current = setTimeout(poll, 2000);
      };

      // Start first poll immediately
      poll();
    },
    [stopPolling]
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  useEffect(() => {
    trackJobsRef.current = trackJobs;
  }, [trackJobs]);

  useEffect(() => {
    previewTracksRef.current = previewTracks;
  }, [previewTracks]);

  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (prompt && !smartPrompt) {
      setSmartPrompt(prompt);
      setMode("smart");
    }
  }, [searchParams, smartPrompt]);

  useEffect(() => {
    autoSaveRef.current = autoSave;
  }, [autoSave]);

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
            inference_steps: track.inference_steps ?? 8,
            thinking: track.thinking ?? true,
            infer_method: track.infer_method ?? "ode",
            lm_temperature: track.lm_temperature ?? 0.85,
            lm_cfg_scale: track.lm_cfg_scale ?? 2.0,
            lm_top_k: track.lm_top_k ?? 0,
            lm_top_p: track.lm_top_p ?? 0.9,
            lm_negative_prompt: track.lm_negative_prompt || null,
          };
          console.group(`Track ${idx === 0 ? "A" : "B"} → /api/generate`);
          console.log("Caption:", payload.caption);
          console.log("Lyrics:", payload.lyrics?.substring(0, 200) + (payload.lyrics && payload.lyrics.length > 200 ? "..." : ""));
          console.log("Duration:", payload.duration, "s");
          console.log("Instrumental:", payload.instrumental);
          console.log("BPM:", payload.bpm);
          console.log("Key:", payload.keyscale);
          console.log("Time sig:", payload.timesignature);
          console.log("Inference steps:", payload.inference_steps);
          console.log("Thinking:", payload.thinking);
          console.log("Infer method:", payload.infer_method);
          console.log("LM temp:", payload.lm_temperature, "CFG:", payload.lm_cfg_scale, "TopK:", payload.lm_top_k, "TopP:", payload.lm_top_p);
          console.log("Language:", payload.vocal_language);
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
            position: result.value.position || 0,
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
    setLongerDuration(Math.min(duration + 30, 120));
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
    console.log("Instrumental:", isInstrumental);
    console.log("Lyrics density:", lyricsDensity);
    console.log("Contrast level:", contrastLevel);
    console.log("Alt lyrics:", altLyrics);
    console.log("Duration:", duration);
    console.log("Seed:", seed);

    const seedA = parseSeed(seed);
    const seedB = seedA !== undefined ? seedA + 1 : undefined;
    console.log("Parsed seeds:", { seedA, seedB });

    if (isInstrumental) {
      const draftA = makeDraft(prompt, "[Instrumental]", duration, true, seedA);
      const contrastCaption = buildContrastCaption(prompt);
      console.log("Track A caption:", prompt);
      console.log("Track B contrast caption:", contrastCaption);
      const draftB = makeDraft(contrastCaption, "[Instrumental]", duration, true, seedB);
      setPreviewTracks([draftA, draftB]);
      console.log("Draft A:", draftA);
      console.log("Draft B:", draftB);
      console.groupEnd();
      setState("preview-lyrics");
      return;
    }

    setState("writing-lyrics");
    try {
      console.log("Generating primary lyrics...");
      const primary = await generateLyrics({
        prompt,
        vibe,
        lyricsDensity,
        duration,
      });

      const finalDuration = primary.duration || duration;
      console.log("Primary result — caption:", primary.caption);
      console.log("Primary result — lyrics:", primary.lyrics);
      console.log("Final duration:", finalDuration);

      let secondary;
      if (altLyrics) {
        console.log("Generating alternate lyrics with contrast:", contrastLevel);
        secondary = await generateLyrics({
            prompt,
            vibe,
            lyricsDensity,
            duration,
            variant: "alternate",
            baseLyrics: primary.lyrics,
            baseCaption: primary.caption,
            contrast: contrastLevel,
          });
        console.log("Alternate result — caption:", secondary.caption);
        console.log("Alternate result — lyrics:", secondary.lyrics);
      } else {
        const contrastCaption = buildContrastCaption(primary.caption);
        console.log("No alt lyrics — using contrast caption:", contrastCaption);
        secondary = { ...primary, caption: contrastCaption };
      }

      const draftA = makeDraft(primary.caption, primary.lyrics, finalDuration, false, seedA);
      const draftB = makeDraft(
        secondary.caption,
        altLyrics ? secondary.lyrics : primary.lyrics,
        secondary.duration || finalDuration,
        false,
        seedB
      );

      console.log("Final Draft A:", draftA);
      console.log("Final Draft B:", draftB);
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

  const handleProGenerate = async () => {
    setError(null);
    if (!caption.trim()) {
      setError("Please describe the music you want");
      return;
    }

    console.group("%c[RIFF] Pro Generate", "color: #ec4899; font-weight: bold; font-size: 14px");
    console.log("Caption:", caption);
    console.log("Style tags:", styleTags);
    console.log("Avoid tags:", negativeTags);
    console.log("Instrumental:", isInstrumental);
    console.log("Lyrics density:", lyricsDensity);
    console.log("Contrast level:", contrastLevel);
    console.log("Alt lyrics:", altLyrics);
    console.log("Duration:", duration);
    console.log("BPM:", bpm);
    console.log("Key:", musicalKey);
    console.log("Time sig:", timeSignature);
    console.log("Language:", vocalLanguage);
    console.log("Seed:", seed);
    console.log("Manual lyrics:", lyrics ? `${lyrics.length} chars` : "(none)");

    const baseCaption = buildCaptionWithTags(caption);
    const altCaption = buildContrastCaption(baseCaption);
    const seedA = parseSeed(seed);
    const seedB = seedA !== undefined ? seedA + 1 : undefined;

    console.log("Built base caption:", baseCaption);
    console.log("Built alt caption:", altCaption);
    console.log("Parsed seeds:", { seedA, seedB });

    if (isInstrumental) {
      const draftA = makeDraft(baseCaption, "[Instrumental]", duration, true, seedA);
      const draftB = makeDraft(altCaption, "[Instrumental]", duration, true, seedB);
      console.log("Instrumental Draft A:", draftA);
      console.log("Instrumental Draft B:", draftB);
      console.groupEnd();
      setPreviewTracks([draftA, draftB]);
      setState("preview-lyrics");
      return;
    }

    let primaryLyrics = lyrics.trim();
    let secondaryLyrics = lyrics.trim();
    let selectedDuration = duration;

    if (!primaryLyrics) {
      setState("writing-lyrics");
      try {
        console.log("No manual lyrics — generating from caption...");
        const primary = await generateLyrics({
          prompt: baseCaption,
          lyricsDensity,
          duration,
        });
        const finalDuration = primary.duration || duration;
        primaryLyrics = primary.lyrics;
        secondaryLyrics = primary.lyrics;
        selectedDuration = finalDuration;
        console.log("Primary lyrics generated, duration:", finalDuration);

        if (altLyrics) {
          console.log("Generating alternate lyrics with contrast:", contrastLevel);
          const secondary = await generateLyrics({
            prompt: baseCaption,
            lyricsDensity,
            duration,
            variant: "alternate",
            baseLyrics: primary.lyrics,
            baseCaption: primary.caption,
            contrast: contrastLevel,
          });
          secondaryLyrics = secondary.lyrics;
          console.log("Alternate lyrics generated");
        }

        setDuration(finalDuration);
      } catch (err) {
        console.error("Pro generate lyrics failed:", err);
        console.groupEnd();
        setError(err instanceof Error ? err.message : "Failed to generate lyrics");
        setState("compose");
        return;
      }
    } else if (altLyrics) {
      setState("writing-lyrics");
      try {
        console.log("Manual lyrics provided, generating alternate...");
        const secondary = await generateLyrics({
          prompt: baseCaption,
          duration,
          variant: "alternate",
          baseLyrics: primaryLyrics,
          baseCaption: baseCaption,
          contrast: contrastLevel,
        });
        secondaryLyrics = secondary.lyrics;
        console.log("Alternate lyrics generated");
      } catch (err) {
        console.error("Pro generate alt lyrics failed:", err);
        console.groupEnd();
        setError(err instanceof Error ? err.message : "Failed to generate lyrics");
        setState("compose");
        return;
      }
    } else {
      console.log("Using manual lyrics for both tracks");
    }

    const draftA = makeDraft(baseCaption, primaryLyrics, selectedDuration, false, seedA);
    const draftB = makeDraft(altCaption, secondaryLyrics || primaryLyrics, selectedDuration, false, seedB);
    console.log("Final Draft A:", draftA);
    console.log("Final Draft B:", draftB);
    console.groupEnd();

    setPreviewTracks([draftA, draftB]);
    setState("preview-lyrics");
  };

  const handlePreviewGenerate = async () => {
    setError(null);
    await submitTracks(previewTracks);
  };

  const handleGenerateLonger = async () => {
    const nextDuration = Math.min(Math.max(longerDuration, 10), 120);
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

    const trackLabel = index === 0 ? "A" : "B";
    console.group(`%c[RIFF] Regenerate Track ${trackLabel}`, "color: #f97316; font-weight: bold; font-size: 14px");

    setError(null);
    setState("queued");

    const currentSeed = track.seed ? parseSeed(track.seed) : undefined;
    const regenSeed = currentSeed !== undefined ? currentSeed + 17 : undefined;

    const payload = {
      caption: track.caption,
      lyrics: track.instrumental ? "[Instrumental]" : track.lyrics,
      duration: track.duration,
      instrumental: track.instrumental,
      bpm: track.bpm ? parseInt(track.bpm, 10) : null,
      keyscale: track.keyscale || null,
      timesignature: track.timesignature || null,
      vocal_language: track.vocal_language || null,
      inference_steps: track.inference_steps ?? 8,
      thinking: track.thinking ?? true,
      infer_method: track.infer_method ?? "ode",
      lm_temperature: track.lm_temperature ?? 0.85,
      lm_cfg_scale: track.lm_cfg_scale ?? 2.0,
      lm_top_k: track.lm_top_k ?? 0,
      lm_top_p: track.lm_top_p ?? 0.9,
      lm_negative_prompt: track.lm_negative_prompt || null,
      seed: regenSeed ?? null,
    };
    console.log("Caption:", payload.caption);
    console.log("Lyrics:", payload.lyrics?.substring(0, 200));
    console.log("Duration:", payload.duration, "s");
    console.log("Seed:", currentSeed, "→", regenSeed);
    console.log("Full payload:", payload);

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
      console.log("Submitted — job_id:", data.job_id);
      console.groupEnd();

      setTrackJobs((prev) =>
        prev.map((job, idx) =>
          idx === index
            ? {
                id: data.job_id,
                status: "queued",
                position: data.position || 0,
                audioUrl: null,
                audioBlob: null,
                error: null,
                saved: false,
              }
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
      console.error(`[RIFF] Regenerate Track ${trackLabel} failed:`, err);
      console.groupEnd();
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

  const handleGenreSelect = (prompt: string, label: string) => {
    setCaption(prompt);
    setSelectedGenre(label);
  };

  const insertSectionMarker = (marker: string) => {
    const textarea = lyricsRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = lyrics.slice(0, start);
    const after = lyrics.slice(end);
    const insertion = before.endsWith("\n") || before === "" ? `${marker}\n` : `\n${marker}\n`;
    const newLyrics = before + insertion + after;
    setLyrics(newLyrics);

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + insertion.length;
      textarea.setSelectionRange(newPos, newPos);
    });
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
      const response = await generateLyrics({
        prompt: `Rewrite only the chorus for this song. Return full lyrics with section markers.`,
        duration: track.duration,
        variant: "alternate",
        baseLyrics: track.lyrics,
        baseCaption: track.caption,
        contrast: contrastLevel,
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
    setStyleTags("");
    setNegativeTags("");
    setSeed("");
    setSelectedGenre(null);
    setVibe(null);
    setIsInstrumental(false);
    setLyricsDensity("moderate");
    setAutoSave(true);
    setBpm("");
    setMusicalKey("");
    setTimeSignature("");
    setVocalLanguage("auto");
    setGenreSearch("");
    setShowMusicalControls(false);
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

  const canSmartGenerate = smartPrompt.trim().length > 0;
  const canProGenerate = caption.trim().length > 0;

  const anyQueued = trackJobs.some((job) => job.status === "queued");
  const anyGenerating = trackJobs.some((job) => job.status === "generating");

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="bg-white/80 border-b border-black/[0.06] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-accent text-white flex items-center justify-center">
              <Logo showText={false} className="text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Riff</span>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              href="/library"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Library
            </Link>
            <a
              href="https://github.com/ace-step/ACE-Step-1.5"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Powered by ACE-Step
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-3xl space-y-8">
          {/* Hero */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-balance">
              {state === "player"
                ? "Your two tracks are ready"
                : state === "preview-lyrics"
                ? "Review your tracks"
                : "Describe the music in your head"}
            </h1>
            <p className="text-muted-foreground text-pretty">
              {state === "player"
                ? "Compare, download, or generate again"
                : state === "preview-lyrics"
                ? "Edit anything, then generate both versions"
                : "Smart for speed, Pro for total control. We generate two distinct takes every time."}
            </p>
          </div>

          {/* ─── Player State ─── */}
          {state === "player" ? (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {trackJobs.map((job, index) => (
                  <div key={index} className="glass rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Track {index === 0 ? "A" : "B"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {index === 0 ? "Primary" : "Alternate"}
                      </span>
                    </div>
                    {job.audioUrl ? (
                      <AudioPlayer src={job.audioUrl} />
                    ) : (
                      <p className="text-sm text-muted-foreground">Audio unavailable.</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => handleRegenerateTrack(index)}
                        className="px-3 py-1.5 rounded-full glass glass-hover"
                      >
                        Retake
                      </button>
                      {!job.saved && (
                        <button
                          type="button"
                          onClick={() => handleSaveTrack(index)}
                          className="px-3 py-1.5 rounded-full glass glass-hover"
                        >
                          Save to Library
                        </button>
                      )}
                      {job.saved && <span className="px-3 py-1.5 rounded-full glass">Saved</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="glass rounded-3xl p-6 space-y-4">
                <div className="text-sm font-medium">Iterate</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Generate longer version</div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Duration</span>
                      <span className="font-mono tabular-nums">{longerDuration}s</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={120}
                      step={5}
                      value={longerDuration}
                      onChange={(e) => setLongerDuration(parseInt(e.target.value, 10))}
                      className="w-full"
                      aria-label="Longer version duration"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateLonger}
                      className="w-full rounded-xl px-4 py-2 btn-primary text-white text-sm font-semibold"
                    >
                      Generate longer version
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Edit &amp; refine</div>
                    <p className="text-sm text-muted-foreground text-pretty">
                      Tweak prompts or lyrics before regenerating both tracks.
                    </p>
                    <button
                      type="button"
                      onClick={() => setState("preview-lyrics")}
                      className="w-full rounded-xl px-4 py-2 glass glass-hover text-muted-foreground text-sm font-semibold"
                    >
                      Edit prompts &amp; lyrics
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full rounded-xl px-4 py-2 glass glass-hover text-muted-foreground text-sm font-semibold"
                    >
                      Start new idea
                    </button>
                  </div>
                </div>
              </div>
            </div>

          ) : state === "queued" || state === "generating" ? (
            <div className="space-y-4">
              {anyGenerating && <GeneratingState />}
              {anyQueued && (
                <div className="glass rounded-3xl p-6 space-y-4">
                  <div className="text-sm font-medium">Queue status</div>
                  {trackJobs.map((job, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm text-muted-foreground"
                    >
                      <span>Track {index === 0 ? "A" : "B"}</span>
                      <span>
                        {job.status === "queued"
                          ? `Queued #${job.position || "?"}`
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
              <button
                onClick={handleCancel}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Cancel
              </button>
            </div>

          ) : state === "writing-lyrics" ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-accent"
                >
                  <path d="M10 2L12.5 7.5L18 10L12.5 12.5L10 18L7.5 12.5L2 10L7.5 7.5L10 2Z" />
                </svg>
                <span className="text-sm text-muted-foreground">
                  Writing lyrics with AI...
                </span>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="size-1.5 rounded-full bg-accent"
                    style={{
                      animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>

          ) : state === "preview-lyrics" ? (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {previewTracks.map((track, index) => (
                  <div key={index} className="glass rounded-3xl p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        Track {index === 0 ? "A" : "B"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {index === 0 ? "Primary" : "Alternate"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase">
                        Style
                      </label>
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
                        <label className="text-xs font-medium text-muted-foreground uppercase">
                          Lyrics
                        </label>
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
                        <button
                          type="button"
                          onClick={() => handleRewriteChorus(index)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Rewrite chorus
                        </button>
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
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleBackFromPreview}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 glass glass-hover text-muted-foreground font-medium text-sm transition-colors hover:text-foreground"
                >
                  Back
                </button>
                <button
                  onClick={handlePreviewGenerate}
                  className="flex-[2] flex items-center justify-center gap-2 rounded-xl px-6 py-3 btn-primary text-white font-semibold text-base"
                >
                  Generate Both Tracks
                </button>
              </div>
            </div>

          ) : (
            <div className="space-y-5">
              {/* Mode toggle */}
              <div className="glass-pill flex">
                <button
                  type="button"
                  onClick={() => setMode("smart")}
                  className={cn(
                    "glass-pill-segment flex-1 flex items-center justify-center gap-1.5",
                    mode === "smart" && "active"
                  )}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M7 1.5L8.5 5L12 7L8.5 9L7 12.5L5.5 9L2 7L5.5 5L7 1.5Z" />
                  </svg>
                  Smart
                </button>
                <button
                  type="button"
                  onClick={() => setMode("pro")}
                  className={cn(
                    "glass-pill-segment flex-1 flex items-center justify-center gap-1.5",
                    mode === "pro" && "active"
                  )}
                >
                  Pro
                </button>
              </div>

              {/* ─── Smart Mode Form ─── */}
              {mode === "smart" ? (
                <div className="glass rounded-3xl p-6 space-y-5">
                  {/* Vibe pills */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Vibe
                    </label>
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
                    <label
                      htmlFor="smart-prompt"
                      className="text-xs font-medium text-muted-foreground uppercase"
                    >
                      What kind of song do you want?
                    </label>
                    <textarea
                      id="smart-prompt"
                      value={smartPrompt}
                      onChange={(e) => setSmartPrompt(e.target.value)}
                      placeholder="e.g. A happy birthday song for my wife Preksha and son Kaay, upbeat and fun with their names in it"
                      rows={4}
                      maxLength={1000}
                      className="w-full rounded-xl glass-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none"
                    />
                  </div>

                  {/* Vocal / Instrumental toggle */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Type
                    </label>
                    <div className="glass-pill flex">
                      <button
                        type="button"
                        onClick={() => setIsInstrumental(false)}
                        className={cn(
                          "glass-pill-segment flex-1 text-center",
                          !isInstrumental && "active"
                        )}
                      >
                        Vocal
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsInstrumental(true)}
                        className={cn(
                          "glass-pill-segment flex-1 text-center",
                          isInstrumental && "active"
                        )}
                      >
                        Instrumental
                      </button>
                    </div>
                  </div>

                  {/* Language (vocal only) */}
                  {!isInstrumental && (
                    <div className="space-y-1">
                      <label
                        htmlFor="smart-vocal-language"
                        className="text-xs font-medium text-muted-foreground uppercase"
                      >
                        Language
                      </label>
                      <select
                        id="smart-vocal-language"
                        value={vocalLanguage}
                        onChange={(e) => setVocalLanguage(e.target.value)}
                        className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-foreground bg-transparent focus:outline-none appearance-none cursor-pointer"
                      >
                        {LANGUAGES.map((lang) => (
                          <option
                            key={lang.value}
                            value={lang.value}
                            className="bg-white"
                          >
                            {lang.label}{lang.experimental ? " (experimental)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Lyrics density (vocal only) */}
                  {!isInstrumental && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase">
                        Lyrics density
                      </label>
                      <div className="glass-pill flex">
                        {(["light", "moderate", "heavy"] as const).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setLyricsDensity(d)}
                            className={cn(
                              "glass-pill-segment flex-1 text-center capitalize",
                              lyricsDensity === d && "active"
                            )}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Variants */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Two-track variation
                    </label>
                    <div className="glass-pill flex">
                      {(["subtle", "balanced", "bold"] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setContrastLevel(level)}
                          className={cn(
                            "glass-pill-segment flex-1 text-center capitalize",
                            contrastLevel === level && "active"
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    {!isInstrumental && (
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={altLyrics}
                          onChange={(e) => setAltLyrics(e.target.checked)}
                        />
                        Generate alternate lyrics for Track B
                      </label>
                    )}
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={autoSave}
                        onChange={(e) => setAutoSave(e.target.checked)}
                      />
                      Auto-save to Library
                    </label>
                  </div>

                  {/* Duration slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground uppercase">
                        Duration
                      </label>
                      <span className="text-sm font-mono text-foreground tabular-nums">
                        {duration}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={120}
                      step={5}
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                      className="w-full"
                      aria-label="Duration in seconds"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                      <span>10s</span>
                      <span>120s</span>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5">
                      {error}
                    </p>
                  )}

                  {/* CTA */}
                  <button
                    onClick={handleSmartGenerate}
                    disabled={!canSmartGenerate}
                    className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 btn-primary text-white font-semibold text-base"
                  >
                    {isInstrumental ? "Generate Two Tracks" : "Write Lyrics & Preview"}
                  </button>
                </div>

              ) : (
                <div className="glass rounded-3xl p-6 space-y-5">
                  {/* Genre quick picks */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Genre
                    </label>
                    <input
                      type="text"
                      value={genreSearch}
                      onChange={(e) => setGenreSearch(e.target.value)}
                      placeholder="Search genres..."
                      className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                    />
                    <GenrePills
                      selected={selectedGenre}
                      onSelect={handleGenreSelect}
                      filter={genreSearch}
                    />
                  </div>

                  {/* Music description */}
                  <div className="space-y-2">
                    <label
                      htmlFor="caption"
                      className="text-xs font-medium text-muted-foreground uppercase"
                    >
                      Music description
                    </label>
                    <textarea
                      id="caption"
                      value={caption}
                      onChange={(e) => {
                        setCaption(e.target.value);
                        setSelectedGenre(null);
                      }}
                      placeholder="e.g. A melancholic piano ballad with soft strings and rain sounds..."
                      rows={3}
                      maxLength={512}
                      className="w-full rounded-xl glass-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none"
                    />
                  </div>

                  {/* Style tags */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Style tags</label>
                      <input
                        type="text"
                        value={styleTags}
                        onChange={(e) => setStyleTags(e.target.value)}
                        placeholder="lofi, warm vinyl, soft piano"
                        className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Avoid</label>
                      <input
                        type="text"
                        value={negativeTags}
                        onChange={(e) => setNegativeTags(e.target.value)}
                        placeholder="no heavy drums, no distortion"
                        className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Musical controls (collapsible) */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowMusicalControls(!showMusicalControls)}
                      className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className={cn(
                          "transition-transform",
                          showMusicalControls && "rotate-90"
                        )}
                      >
                        <path d="M4.5 2.5l4 3.5-4 3.5" />
                      </svg>
                      <span className="uppercase">Musical Controls</span>
                    </button>

                    {showMusicalControls && (
                      <div className="space-y-4 pt-2">
                        {/* BPM */}
                        <div className="space-y-1">
                          <label htmlFor="bpm" className="text-xs text-muted-foreground">
                            BPM (leave empty for auto)
                          </label>
                          <input
                            id="bpm"
                            type="number"
                            min={40}
                            max={240}
                            value={bpm}
                            onChange={(e) => setBpm(e.target.value)}
                            placeholder="Auto"
                            className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                          />
                        </div>

                        {/* Key */}
                        <div className="space-y-1">
                          <label htmlFor="musical-key" className="text-xs text-muted-foreground">
                            Key (leave empty for auto)
                          </label>
                          <select
                            id="musical-key"
                            value={musicalKey}
                            onChange={(e) => setMusicalKey(e.target.value)}
                            className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-foreground bg-transparent focus:outline-none appearance-none cursor-pointer"
                          >
                            <option value="" className="bg-white">
                              Auto
                            </option>
                            {MUSICAL_KEYS.map((k) => (
                              <option key={k} value={k} className="bg-white">
                                {k}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Time Signature */}
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Time Signature
                          </label>
                          <div className="glass-pill flex">
                            {["", "4", "3", "6"].map((ts) => (
                              <button
                                key={ts}
                                type="button"
                                onClick={() => setTimeSignature(ts)}
                                className={cn(
                                  "glass-pill-segment flex-1 text-center",
                                  timeSignature === ts && "active"
                                )}
                              >
                                {ts ? ({ "4": "4/4", "3": "3/4", "6": "6/8" } as Record<string, string>)[ts] : "Auto"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Seed */}
                        <div className="space-y-1">
                          <label htmlFor="seed" className="text-xs text-muted-foreground">
                            Seed (leave empty for random)
                          </label>
                          <input
                            id="seed"
                            type="number"
                            value={seed}
                            onChange={(e) => setSeed(e.target.value)}
                            placeholder="Random"
                            className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Generation Settings (collapsible) */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedGen(!showAdvancedGen)}
                      className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className={cn(
                          "transition-transform",
                          showAdvancedGen && "rotate-90"
                        )}
                      >
                        <path d="M4.5 2.5l4 3.5-4 3.5" />
                      </svg>
                      <span className="uppercase">Generation Settings</span>
                    </button>

                    {showAdvancedGen && (
                      <div className="space-y-4 pt-2">
                        {/* Thinking toggle */}
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-muted-foreground flex-1">
                            Thinking (Chain-of-Thought)
                          </label>
                          <button
                            type="button"
                            onClick={() => setThinking(!thinking)}
                            className={cn(
                              "w-10 h-5 rounded-full transition-colors relative",
                              thinking ? "bg-foreground/80" : "bg-foreground/20"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                                thinking ? "left-5" : "left-0.5"
                              )}
                            />
                          </button>
                        </div>

                        {/* Inference Steps */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-muted-foreground">
                              Quality (Inference Steps)
                            </label>
                            <span className="text-xs text-muted-foreground/70">{inferenceSteps}</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={20}
                            step={1}
                            value={inferenceSteps}
                            onChange={(e) => setInferenceSteps(parseInt(e.target.value, 10))}
                            className="w-full accent-foreground/60"
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground/50">
                            <span>Fast</span>
                            <span>High Quality</span>
                          </div>
                        </div>

                        {/* Inference Method */}
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Inference Method
                          </label>
                          <div className="glass-pill flex">
                            {(["ode", "sde"] as const).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setInferMethod(m)}
                                className={cn(
                                  "glass-pill-segment flex-1 text-center",
                                  inferMethod === m && "active"
                                )}
                              >
                                {m === "ode" ? "ODE (Clean)" : "SDE (Textured)"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* LM Temperature */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-muted-foreground">
                              Creativity (LM Temperature)
                            </label>
                            <span className="text-xs text-muted-foreground/70">{lmTemperature.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={2}
                            step={0.05}
                            value={lmTemperature}
                            onChange={(e) => setLmTemperature(parseFloat(e.target.value))}
                            className="w-full accent-foreground/60"
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground/50">
                            <span>Predictable</span>
                            <span>Creative</span>
                          </div>
                        </div>

                        {/* LM CFG Scale */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-muted-foreground">
                              LM Guidance (CFG Scale)
                            </label>
                            <span className="text-xs text-muted-foreground/70">{lmCfgScale.toFixed(1)}</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.1}
                            value={lmCfgScale}
                            onChange={(e) => setLmCfgScale(parseFloat(e.target.value))}
                            className="w-full accent-foreground/60"
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground/50">
                            <span>Free</span>
                            <span>Guided</span>
                          </div>
                        </div>

                        {/* LM Top-K & Top-P side by side */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-muted-foreground">Top-K</label>
                              <span className="text-xs text-muted-foreground/70">{lmTopK || "Off"}</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={lmTopK}
                              onChange={(e) => setLmTopK(parseInt(e.target.value, 10))}
                              className="w-full accent-foreground/60"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-muted-foreground">Top-P</label>
                              <span className="text-xs text-muted-foreground/70">{lmTopP.toFixed(2)}</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={lmTopP}
                              onChange={(e) => setLmTopP(parseFloat(e.target.value))}
                              className="w-full accent-foreground/60"
                            />
                          </div>
                        </div>

                        {/* LM Negative Prompt */}
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Negative Prompt (things to avoid in generation)
                          </label>
                          <input
                            type="text"
                            value={lmNegativePrompt}
                            onChange={(e) => setLmNegativePrompt(e.target.value)}
                            placeholder="e.g. distortion, heavy bass, noise"
                            className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vocal / Instrumental toggle */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Type
                    </label>
                    <div className="glass-pill flex">
                      <button
                        type="button"
                        onClick={() => setIsInstrumental(false)}
                        className={cn(
                          "glass-pill-segment flex-1 text-center",
                          !isInstrumental && "active"
                        )}
                      >
                        Vocal
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsInstrumental(true)}
                        className={cn(
                          "glass-pill-segment flex-1 text-center",
                          isInstrumental && "active"
                        )}
                      >
                        Instrumental
                      </button>
                    </div>
                  </div>

                  {/* Language (vocal only) */}
                  {!isInstrumental && (
                    <div className="space-y-1">
                      <label
                        htmlFor="vocal-language"
                        className="text-xs font-medium text-muted-foreground uppercase"
                      >
                        Language
                      </label>
                      <select
                        id="vocal-language"
                        value={vocalLanguage}
                        onChange={(e) => setVocalLanguage(e.target.value)}
                        className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-foreground bg-transparent focus:outline-none appearance-none cursor-pointer"
                      >
                        {LANGUAGES.map((lang) => (
                          <option
                            key={lang.value}
                            value={lang.value}
                            className="bg-white"
                          >
                            {lang.label}{lang.experimental ? " (experimental)" : ""}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Some languages are experimental and may have lower lyric accuracy.
                      </p>
                    </div>
                  )}

                  {/* Lyrics editor (vocal only) */}
                  {!isInstrumental && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase">
                        Lyrics (optional)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {SECTION_MARKERS.map((marker) => (
                          <button
                            key={marker}
                            type="button"
                            onClick={() => insertSectionMarker(marker)}
                            className="glass-chip text-xs px-2.5 py-1"
                          >
                            {marker}
                          </button>
                        ))}
                      </div>
                      <textarea
                        ref={lyricsRef}
                        value={lyrics}
                        onChange={(e) => setLyrics(e.target.value)}
                        placeholder="[Verse]\nYour lyrics here...\n\n[Chorus]\nSing along..."
                        rows={6}
                        maxLength={4096}
                        className="w-full rounded-xl glass-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 font-mono resize-none focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Lyrics density (vocal only) */}
                  {!isInstrumental && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase">
                        Lyrics density
                      </label>
                      <div className="glass-pill flex">
                        {(["light", "moderate", "heavy"] as const).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setLyricsDensity(d)}
                            className={cn(
                              "glass-pill-segment flex-1 text-center capitalize",
                              lyricsDensity === d && "active"
                            )}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Two-track variations */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Two-track variation
                    </label>
                    <div className="glass-pill flex">
                      {(["subtle", "balanced", "bold"] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setContrastLevel(level)}
                          className={cn(
                            "glass-pill-segment flex-1 text-center capitalize",
                            contrastLevel === level && "active"
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    {!isInstrumental && (
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={altLyrics}
                          onChange={(e) => setAltLyrics(e.target.checked)}
                        />
                        Generate alternate lyrics for Track B
                      </label>
                    )}
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={autoSave}
                        onChange={(e) => setAutoSave(e.target.checked)}
                      />
                      Auto-save to Library
                    </label>
                  </div>

                  {/* Duration slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground uppercase">
                        Duration
                      </label>
                      <span className="text-sm font-mono text-foreground tabular-nums">
                        {duration}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={120}
                      step={5}
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                      className="w-full"
                      aria-label="Duration in seconds"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                      <span>10s</span>
                      <span>120s</span>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5">
                      {error}
                    </p>
                  )}

                  {/* Generate button */}
                  <button
                    onClick={handleProGenerate}
                    disabled={!canProGenerate}
                    className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 btn-primary text-white font-semibold text-base"
                  >
                    Generate Two Tracks
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 border-t border-black/[0.06] px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Free &amp; open-source. Built with{" "}
          <a
            href="https://github.com/ace-step/ACE-Step-1.5"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            ACE-Step v1.5
          </a>
          . Saved locally in your browser.
        </p>
      </footer>
    </div>
  );
}
