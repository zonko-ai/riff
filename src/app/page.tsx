"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { GenrePills } from "@/components/genre-pills";
import { AudioPlayer } from "@/components/audio-player";
import { GeneratingState } from "@/components/generating-state";
import { QueueStatus } from "@/components/queue-status";

type AppState =
  | "compose"
  | "writing-lyrics"
  | "preview-lyrics"
  | "queued"
  | "generating"
  | "player";

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

const LANGUAGES = [
  "Auto",
  "English",
  "Spanish",
  "French",
  "Japanese",
  "Korean",
  "Chinese",
  "Hindi",
  "Portuguese",
  "German",
  "Arabic",
  "Italian",
  "Russian",
  "Thai",
  "Vietnamese",
  "Turkish",
] as const;

const SECTION_MARKERS = ["[Verse]", "[Chorus]", "[Bridge]", "[Outro]", "[Intro]"] as const;

export default function Home() {
  // Core state machine
  const [state, setState] = useState<AppState>("compose");
  const [smartMode, setSmartMode] = useState(true);

  // Shared form state
  const [caption, setCaption] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [duration, setDuration] = useState(30);
  const [isInstrumental, setIsInstrumental] = useState(false);

  // Smart mode state
  const [smartPrompt, setSmartPrompt] = useState("");
  const [vibe, setVibe] = useState<string | null>(null);
  const [lyricsDensity, setLyricsDensity] = useState<"light" | "moderate" | "heavy">("moderate");

  // Manual mode state
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genreSearch, setGenreSearch] = useState("");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [timeSignature, setTimeSignature] = useState("");
  const [vocalLanguage, setVocalLanguage] = useState("auto");
  const [showMusicalControls, setShowMusicalControls] = useState(false);

  // Job / playback state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);

  // Refs
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lyricsRef = useRef<HTMLTextAreaElement>(null);

  // ──────────────────────────────────────────────
  // Polling
  // ──────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/generate?job_id=${id}`);
          if (!res.ok) return;
          const data = await res.json();

          if (data.status === "queued") {
            setQueuePosition(data.position);
            setState("queued");
          } else if (data.status === "generating") {
            setState("generating");
          } else if (data.status === "complete" && data.audio_url) {
            stopPolling();
            const audioRes = await fetch(`/api/audio?job_id=${id}`);
            if (audioRes.ok) {
              const blob = await audioRes.blob();
              const url = URL.createObjectURL(blob);
              setAudioUrl(url);
              setState("player");
            } else {
              setError("Failed to fetch audio");
              setState("compose");
            }
          } else if (data.status === "failed") {
            stopPolling();
            setError(data.error || "Generation failed");
            setState("compose");
          }
        } catch {
          // Silently retry on network errors
        }
      }, 2000);
    },
    [stopPolling]
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ──────────────────────────────────────────────
  // Submit to queue (shared by all paths)
  // ──────────────────────────────────────────────

  const submitToQueue = useCallback(
    async (opts: {
      caption: string;
      lyrics: string;
      duration: number;
      instrumental?: boolean;
      bpm?: string;
      keyscale?: string;
      timesignature?: string;
      vocal_language?: string;
    }) => {
      setState("queued");
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption: opts.caption,
            lyrics: opts.instrumental ? "[Instrumental]" : opts.lyrics,
            duration: opts.duration,
            instrumental: opts.instrumental || false,
            bpm: opts.bpm ? parseInt(opts.bpm) : null,
            keyscale: opts.keyscale || null,
            timesignature: opts.timesignature || null,
            vocal_language: opts.vocal_language || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to submit");
        }
        const data = await res.json();
        setJobId(data.job_id);
        setQueuePosition(data.position);
        startPolling(data.job_id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setState("compose");
      }
    },
    [startPolling]
  );

  // ──────────────────────────────────────────────
  // Handle generate (Smart mode)
  // ──────────────────────────────────────────────

  const handleSmartGenerate = async () => {
    setError(null);

    if (!smartPrompt.trim()) {
      setError("Please describe the music you want");
      return;
    }

    // Instrumental in smart mode -> skip lyrics, go straight to queue
    if (isInstrumental) {
      await submitToQueue({
        caption: smartPrompt.trim(),
        lyrics: "[Instrumental]",
        duration,
        instrumental: true,
      });
      return;
    }

    // Vocal mode -> generate lyrics first, then preview
    setState("writing-lyrics");
    try {
      const res = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: smartPrompt.trim(),
          vibe: vibe || undefined,
          lyricsDensity,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate lyrics");
      }
      const data = await res.json();
      setCaption(data.caption);
      setLyrics(data.lyrics);
      setDuration(data.duration || duration);
      setState("preview-lyrics");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate lyrics");
      setState("compose");
    }
  };

  // ──────────────────────────────────────────────
  // Handle generate (Manual mode)
  // ──────────────────────────────────────────────

  const handleManualGenerate = async () => {
    setError(null);

    if (!caption.trim()) {
      setError("Please describe the music you want");
      return;
    }

    const finalLyrics =
      isInstrumental || !lyrics.trim() ? "[Instrumental]" : lyrics.trim();

    await submitToQueue({
      caption: caption.trim(),
      lyrics: finalLyrics,
      duration,
      instrumental: isInstrumental,
      bpm: bpm || undefined,
      keyscale: musicalKey || undefined,
      timesignature: timeSignature || undefined,
      vocal_language: vocalLanguage === "auto" ? undefined : vocalLanguage,
    });
  };

  // ──────────────────────────────────────────────
  // Handle generate from lyrics preview
  // ──────────────────────────────────────────────

  const handlePreviewGenerate = async () => {
    setError(null);
    await submitToQueue({
      caption: caption.trim(),
      lyrics: lyrics.trim() || "[Instrumental]",
      duration,
    });
  };

  // ──────────────────────────────────────────────
  // Genre select (Manual mode)
  // ──────────────────────────────────────────────

  const handleGenreSelect = (prompt: string, label: string) => {
    setCaption(prompt);
    setSelectedGenre(label);
  };

  // ──────────────────────────────────────────────
  // Insert section marker at cursor
  // ──────────────────────────────────────────────

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

    // Restore focus and cursor position
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + insertion.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  // ──────────────────────────────────────────────
  // Reset
  // ──────────────────────────────────────────────

  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setJobId(null);
    setSmartPrompt("");
    setCaption("");
    setLyrics("");
    setSelectedGenre(null);
    setVibe(null);
    setIsInstrumental(false);
    setLyricsDensity("moderate");
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
    if (jobId) {
      fetch(`/api/generate?job_id=${jobId}&cancel=1`).catch(() => {});
    }
    setState("compose");
  };

  const handleBackFromPreview = () => {
    setState("compose");
  };

  // ──────────────────────────────────────────────
  // Derived
  // ──────────────────────────────────────────────

  const canSmartGenerate = smartPrompt.trim().length > 0;
  const canManualGenerate = caption.trim().length > 0;

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="backdrop-blur-xl bg-white/[0.02] border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-accent flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                <path d="M13 2.5V11a2.5 2.5 0 1 1-1-2V4.5L6 5.75V12.5A2.5 2.5 0 1 1 5 10.5V3l8-2v1.5z" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight">Riff</span>
          </div>
          <a
            href="https://github.com/ace-step/ACE-Step-1.5"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Powered by ACE-Step
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-8">
          {/* Hero */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-balance">
              {state === "player"
                ? "Your track is ready"
                : state === "preview-lyrics"
                ? "Review your lyrics"
                : "Describe the music in your head"}
            </h1>
            <p className="text-muted-foreground text-pretty">
              {state === "player"
                ? "Listen, download, or make another one"
                : state === "preview-lyrics"
                ? "Edit anything, then generate your track"
                : "Tell us what you want in plain English, or switch to manual mode."}
            </p>
          </div>

          {/* ─── Player State ─── */}
          {state === "player" && audioUrl ? (
            <AudioPlayer src={audioUrl} onReset={handleReset} />

          /* ─── Queue State ─── */
          ) : state === "queued" ? (
            <QueueStatus
              position={queuePosition}
              status="queued"
              onCancel={handleCancel}
            />

          /* ─── Generating State ─── */
          ) : state === "generating" ? (
            <div className="space-y-4">
              <GeneratingState />
              <button
                onClick={handleCancel}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Cancel
              </button>
            </div>

          /* ─── Writing Lyrics State ─── */
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

          /* ─── Preview Lyrics State ─── */
          ) : state === "preview-lyrics" ? (
            <div className="glass rounded-3xl p-6 space-y-5">
              {/* Genre/style badge */}
              {caption && (
                <div className="flex items-start gap-2">
                  <span className="inline-block glass-chip text-xs px-3 py-1.5 shrink-0">
                    Style
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {caption}
                  </p>
                </div>
              )}

              {/* Editable lyrics textarea */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Lyrics
                </label>
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  rows={12}
                  maxLength={4096}
                  className="w-full rounded-xl glass-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 font-mono resize-none focus:outline-none"
                />
              </div>

              {/* Duration display */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Duration</span>
                <span className="font-mono tabular-nums">{duration}s</span>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5">
                  {error}
                </p>
              )}

              {/* Actions */}
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
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="currentColor"
                  >
                    <path d="M13 2.5V11a2.5 2.5 0 1 1-1-2V4.5L6 5.75V12.5A2.5 2.5 0 1 1 5 10.5V3l8-2v1.5z" />
                  </svg>
                  Generate Track
                </button>
              </div>
            </div>

          /* ─── Compose State ─── */
          ) : (
            <div className="space-y-5">
              {/* Mode toggle */}
              <div className="glass-pill flex">
                <button
                  type="button"
                  onClick={() => setSmartMode(true)}
                  className={cn(
                    "glass-pill-segment flex-1 flex items-center justify-center gap-1.5",
                    smartMode && "active"
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
                  onClick={() => setSmartMode(false)}
                  className={cn(
                    "glass-pill-segment flex-1 flex items-center justify-center gap-1.5",
                    !smartMode && "active"
                  )}
                >
                  Manual
                </button>
              </div>

              {/* ─── Smart Mode Form ─── */}
              {smartMode ? (
                <div className="glass rounded-3xl p-6 space-y-5">
                  {/* Vibe pills */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Vibe
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {VIBES.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setVibe(vibe === v ? null : v)}
                          className={cn(
                            "glass-chip",
                            vibe === v && "selected"
                          )}
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
                      className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
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
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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

                  {/* Lyrics density (vocal only) */}
                  {!isInstrumental && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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

                  {/* Duration slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
                      onChange={(e) => setDuration(parseInt(e.target.value))}
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
                    {isInstrumental ? (
                      <>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="currentColor"
                        >
                          <path d="M13 2.5V11a2.5 2.5 0 1 1-1-2V4.5L6 5.75V12.5A2.5 2.5 0 1 1 5 10.5V3l8-2v1.5z" />
                        </svg>
                        Generate
                      </>
                    ) : (
                      <>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M9 2L11 6.5L16 9L11 11.5L9 16L7 11.5L2 9L7 6.5L9 2Z" />
                        </svg>
                        Write Lyrics &amp; Preview
                      </>
                    )}
                  </button>
                </div>

              /* ─── Manual Mode Form ─── */
              ) : (
                <div className="glass rounded-3xl p-6 space-y-5">
                  {/* Genre quick picks */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
                      className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
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
                      <span className="uppercase tracking-wide">
                        Musical Controls
                      </span>
                    </button>

                    {showMusicalControls && (
                      <div className="space-y-4 pt-2">
                        {/* BPM */}
                        <div className="space-y-1">
                          <label
                            htmlFor="bpm"
                            className="text-xs text-muted-foreground"
                          >
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
                          <label
                            htmlFor="musical-key"
                            className="text-xs text-muted-foreground"
                          >
                            Key (leave empty for auto)
                          </label>
                          <select
                            id="musical-key"
                            value={musicalKey}
                            onChange={(e) => setMusicalKey(e.target.value)}
                            className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-foreground bg-transparent focus:outline-none appearance-none cursor-pointer"
                          >
                            <option value="" className="bg-[#0a0a0a]">
                              Auto
                            </option>
                            {MUSICAL_KEYS.map((k) => (
                              <option key={k} value={k} className="bg-[#0a0a0a]">
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
                            {["", "4/4", "3/4", "6/8"].map((ts) => (
                              <button
                                key={ts}
                                type="button"
                                onClick={() => setTimeSignature(ts)}
                                className={cn(
                                  "glass-pill-segment flex-1 text-center",
                                  timeSignature === ts && "active"
                                )}
                              >
                                {ts || "Auto"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vocal / Instrumental toggle */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
                        className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
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
                            key={lang}
                            value={lang.toLowerCase()}
                            className="bg-[#0a0a0a]"
                          >
                            {lang}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Lyrics editor (vocal only) */}
                  {!isInstrumental && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Lyrics (optional)
                      </label>
                      {/* Section marker buttons */}
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
                        placeholder={
                          "[Verse]\nYour lyrics here...\n\n[Chorus]\nSing along..."
                        }
                        rows={6}
                        maxLength={4096}
                        className="w-full rounded-xl glass-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 font-mono resize-none focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Duration slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
                      onChange={(e) => setDuration(parseInt(e.target.value))}
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
                    onClick={handleManualGenerate}
                    disabled={!canManualGenerate}
                    className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 btn-primary text-white font-semibold text-base"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="currentColor"
                    >
                      <path d="M13 2.5V11a2.5 2.5 0 1 1-1-2V4.5L6 5.75V12.5A2.5 2.5 0 1 1 5 10.5V3l8-2v1.5z" />
                    </svg>
                    Generate
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="backdrop-blur-xl bg-white/[0.02] border-t border-white/[0.06] px-6 py-4 text-center">
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
          . No data stored.
        </p>
      </footer>
    </div>
  );
}
