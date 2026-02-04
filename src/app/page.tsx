"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { GenrePills } from "@/components/genre-pills";
import { AudioPlayer } from "@/components/audio-player";
import { GeneratingState } from "@/components/generating-state";

type AppState = "compose" | "generating" | "player";

export default function Home() {
  const [state, setState] = useState<AppState>("compose");
  const [caption, setCaption] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [showLyrics, setShowLyrics] = useState(false);
  const [duration, setDuration] = useState(30);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenreSelect = (prompt: string, label: string) => {
    setCaption(prompt);
    setSelectedGenre(label);
  };

  const handleGenerate = async () => {
    if (!caption.trim()) return;

    setError(null);
    setState("generating");

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: caption.trim(),
          lyrics: showLyrics && lyrics.trim() ? lyrics.trim() : "[Instrumental]",
          duration,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Generation failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setState("player");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setState("compose");
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("compose");
    }
  };

  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setState("compose");
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setState("compose");
  };

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
              Describe the music in your head
            </h1>
            <p className="text-muted-foreground text-pretty">
              Pick a genre or describe what you want. Riff generates a full track in seconds.
            </p>
          </div>

          {state === "player" && audioUrl ? (
            <AudioPlayer src={audioUrl} onReset={handleReset} />
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
          ) : (
            /* Compose form */
            <div className="space-y-5">
              {/* Genre quick picks */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Quick picks
                </label>
                <GenrePills
                  selected={selectedGenre}
                  onSelect={handleGenreSelect}
                  disabled={state !== "compose"}
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
                <div className="flex justify-end">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {caption.length}/512
                  </span>
                </div>
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
                    placeholder={"[Verse]\nYour lyrics here...\n\n[Chorus]\nSing along..."}
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
                disabled={!caption.trim()}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-lg px-6 py-3.5",
                  "bg-accent text-white font-semibold text-base",
                  "hover:bg-accent/90 active:scale-[0.98] transition-all",
                  "disabled:opacity-40 disabled:pointer-events-none"
                )}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <path d="M13 2.5V11a2.5 2.5 0 1 1-1-2V4.5L6 5.75V12.5A2.5 2.5 0 1 1 5 10.5V3l8-2v1.5z" />
                </svg>
                Generate
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
