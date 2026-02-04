"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { GenrePills } from "@/components/genre-pills";
import { AudioPlayer } from "@/components/audio-player";
import { GeneratingState } from "@/components/generating-state";
import { QueueStatus } from "@/components/queue-status";

type AppState = "compose" | "writing-lyrics" | "queued" | "generating" | "player";

export default function Home() {
  const [state, setState] = useState<AppState>("compose");
  const [caption, setCaption] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [showLyrics, setShowLyrics] = useState(false);
  const [smartMode, setSmartMode] = useState(true);
  const [smartPrompt, setSmartPrompt] = useState("");
  const [duration, setDuration] = useState(30);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Poll for job status
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
            // Fetch audio through our proxy
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

  const handleGenreSelect = (prompt: string, label: string) => {
    setCaption(prompt);
    setSelectedGenre(label);
    setSmartMode(false);
    setSmartPrompt("");
  };

  const handleGenerate = async () => {
    setError(null);

    let finalCaption = caption;
    let finalLyrics = showLyrics && lyrics.trim() ? lyrics.trim() : "[Instrumental]";
    let finalDuration = duration;

    // Smart mode: generate lyrics from natural language prompt
    if (smartMode && smartPrompt.trim()) {
      setState("writing-lyrics");
      try {
        const res = await fetch("/api/lyrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: smartPrompt.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to generate lyrics");
        }
        const data = await res.json();
        finalCaption = data.caption;
        finalLyrics = data.lyrics;
        finalDuration = data.duration || duration;

        // Show what AI generated
        setCaption(finalCaption);
        setLyrics(finalLyrics);
        setDuration(finalDuration);
        setShowLyrics(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate lyrics");
        setState("compose");
        return;
      }
    }

    if (!finalCaption.trim()) {
      setError("Please describe the music you want");
      setState("compose");
      return;
    }

    // Submit to queue
    setState("queued");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: finalCaption,
          lyrics: finalLyrics,
          duration: finalDuration,
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
  };

  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setJobId(null);
    setSmartPrompt("");
    setCaption("");
    setLyrics("");
    setShowLyrics(false);
    setSelectedGenre(null);
    setState("compose");
  };

  const handleCancel = async () => {
    stopPolling();
    if (jobId) {
      fetch(`/api/generate?job_id=${jobId}&cancel=1`).catch(() => {});
    }
    setState("compose");
  };

  const canGenerate =
    smartMode ? smartPrompt.trim().length > 0 : caption.trim().length > 0;

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
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
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-8">
          {/* Hero */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-balance">
              {state === "player"
                ? "Your track is ready"
                : "Describe the music in your head"}
            </h1>
            <p className="text-muted-foreground text-pretty">
              {state === "player"
                ? "Listen, download, or make another one"
                : "Tell us what you want in plain English, or pick a genre below."}
            </p>
          </div>

          {state === "player" && audioUrl ? (
            <AudioPlayer src={audioUrl} onReset={handleReset} />
          ) : state === "queued" ? (
            <QueueStatus
              position={queuePosition}
              status="queued"
              onCancel={handleCancel}
            />
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
                      animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 0.3; transform: scale(0.8); }
                  50% { opacity: 1; transform: scale(1); }
                }
              `}</style>
            </div>
          ) : (
            /* Compose form */
            <div className="space-y-5">
              {/* Mode toggle */}
              <div className="flex rounded-lg bg-muted/50 p-1">
                <button
                  type="button"
                  onClick={() => setSmartMode(true)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    smartMode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
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
                    "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    !smartMode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Manual
                </button>
              </div>

              {smartMode ? (
                /* Smart mode */
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
                    className={cn(
                      "w-full rounded-lg bg-muted/50 border border-border px-4 py-3",
                      "text-sm text-foreground placeholder:text-muted-foreground/50",
                      "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-accent/50",
                      "resize-none transition-colors"
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    AI will write custom lyrics and choose the perfect genre for your description.
                  </p>
                </div>
              ) : (
                /* Manual mode */
                <>
                  {/* Genre quick picks */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Quick picks
                    </label>
                    <GenrePills
                      selected={selectedGenre}
                      onSelect={handleGenreSelect}
                    />
                  </div>

                  {/* Caption input */}
                  <div className="space-y-2">
                    <label
                      htmlFor="caption"
                      className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                    >
                      Describe your music
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
                      className={cn(
                        "w-full rounded-lg bg-muted/50 border border-border px-4 py-3",
                        "text-sm text-foreground placeholder:text-muted-foreground/50",
                        "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-accent/50",
                        "resize-none transition-colors"
                      )}
                    />
                  </div>

                  {/* Lyrics toggle */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowLyrics(!showLyrics)}
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
                          showLyrics && "rotate-90"
                        )}
                      >
                        <path d="M4.5 2.5l4 3.5-4 3.5" />
                      </svg>
                      <span className="uppercase tracking-wide">
                        {showLyrics ? "Hide lyrics" : "Add lyrics (optional)"}
                      </span>
                    </button>

                    {showLyrics && (
                      <textarea
                        value={lyrics}
                        onChange={(e) => setLyrics(e.target.value)}
                        placeholder={
                          "[Verse]\nYour lyrics here...\n\n[Chorus]\nSing along..."
                        }
                        rows={5}
                        maxLength={4096}
                        className={cn(
                          "w-full rounded-lg bg-muted/50 border border-border px-4 py-3",
                          "text-sm text-foreground placeholder:text-muted-foreground/50 font-mono",
                          "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-accent/50",
                          "resize-none transition-colors"
                        )}
                      />
                    )}
                  </div>
                </>
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
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-lg px-6 py-3.5",
                  "bg-accent text-white font-semibold text-base",
                  "hover:bg-accent/90 active:scale-[0.98] transition-all",
                  "disabled:opacity-40 disabled:pointer-events-none"
                )}
              >
                {smartMode ? (
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
                    Write &amp; Generate
                  </>
                ) : (
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
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-border/50 text-center">
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
