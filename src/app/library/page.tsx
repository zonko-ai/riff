"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllTracks, LibraryTrack } from "@/lib/library";
import { Logo } from "@/components/logo";
import { AudioPlayer } from "@/components/audio-player";

export default function LibraryPage() {
  const [tracks, setTracks] = useState<LibraryTrack[]>([]);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let createdUrls: string[] = [];

    const load = async () => {
      const items = await getAllTracks();
      if (!active) return;
      const urls: Record<string, string> = {};
      items.forEach((track) => {
        urls[track.id] = URL.createObjectURL(track.audio);
      });
      createdUrls = Object.values(urls);
      setTracks(items);
      setAudioUrls(urls);
    };

    load();

    return () => {
      active = false;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleShare = async (track: LibraryTrack) => {
    const url = audioUrls[track.id];
    if (!url) return;

    try {
      if (navigator.share) {
        const file = new File([track.audio], `${track.title}.mp3`, {
          type: "audio/mpeg",
        });
        await navigator.share({
          title: track.title,
          text: track.caption,
          files: [file],
        });
        setMessage("Shared successfully.");
        return;
      }

      await navigator.clipboard.writeText(track.caption);
      setMessage("Copied prompt to clipboard.");
    } catch {
      setMessage("Share failed. Try downloading instead.");
    }
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-accent text-white flex items-center justify-center shadow-[0_2px_8px_rgba(249,115,22,0.25)]">
              <Logo showText={false} className="text-white" />
            </div>
            <div>
              <div className="text-lg font-semibold font-display">Riff</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">OPEN-SOURCE MUSIC GENERATOR</div>
            </div>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/"
              className="font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Create
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

      <main className="flex-1 px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <div className="text-[11px] font-bold tracking-[0.2em] text-accent uppercase">Your Library</div>
              <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight leading-[1.2]">Collections</h1>
              <p className="text-lg text-muted-foreground max-w-md">
                Access and manage your locally stored audio creations.
              </p>
            </div>
            <Link
              href="/"
              className="rounded-xl px-6 py-3 btn-primary text-white text-sm font-bold flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Create New Track
            </Link>
          </div>

          {message && (
            <div className="text-sm text-muted-foreground">{message}</div>
          )}

          {tracks.length === 0 ? (
            <div className="glass-elevated rounded-3xl p-16 text-center space-y-5">
              <div className="size-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
              </div>
              <h2 className="text-xl font-semibold font-display">Your library is empty</h2>
              <p className="text-[15px] text-muted-foreground text-pretty max-w-sm mx-auto">
                Generate your first tracks and they will appear here automatically.
              </p>
              <Link
                href="/"
                className="inline-flex rounded-xl px-6 py-3 btn-primary text-white text-sm font-semibold gap-2"
              >
                Create your first track
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {tracks.map((track, trackIndex) => (
                <div key={track.id} className="glass-elevated rounded-2xl p-4 md:p-6 space-y-3">
                  {/* Header: number, title, badge, duration, date */}
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="size-9 rounded-lg bg-accent/8 text-accent flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                      {String(trackIndex + 1).padStart(2, "0")}
                    </div>
                    <h3 className="text-base md:text-lg font-bold truncate flex-1 min-w-0">{track.title}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-black/5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">MP3</span>
                    <span className="hidden md:inline text-sm font-mono text-muted-foreground shrink-0">{Math.round(track.duration)}s</span>
                    <span className="hidden md:inline text-[11px] text-muted-foreground shrink-0">
                      {new Date(track.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Player */}
                  <AudioPlayer src={audioUrls[track.id]} showActions={false} />

                  {/* Actions row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={audioUrls[track.id]}
                      download={`${track.title}.mp3`}
                      className="rounded-full px-3 py-1.5 glass glass-hover text-xs text-muted-foreground transition-colors"
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => handleShare(track)}
                      className="rounded-full px-3 py-1.5 glass glass-hover text-xs text-muted-foreground transition-colors"
                    >
                      Share
                    </button>
                    <details className="text-sm text-muted-foreground group inline">
                      <summary className="cursor-pointer rounded-full px-3 py-1.5 glass glass-hover text-xs text-muted-foreground transition-colors inline-flex items-center gap-1.5 list-none [&::-webkit-details-marker]:hidden">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className="transition-transform group-open:rotate-90"
                        >
                          <path d="M4.5 2.5l4 3.5-4 3.5" />
                        </svg>
                        Prompt &amp; Lyrics
                      </summary>
                      <div className="mt-3 glass-subtle rounded-xl p-4 space-y-3">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-muted-foreground/60">Prompt</div>
                          <p className="text-sm text-muted-foreground text-pretty mt-1">
                            {track.caption}
                          </p>
                        </div>
                        {track.lyrics && (
                          <div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground/60">Lyrics</div>
                            <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono mt-1">
                              {track.lyrics}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="px-6 py-16 border-t border-black/[0.04] mt-12">
        <div className="max-w-5xl mx-auto">
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
              <Link href="/" className="hover:text-accent transition-colors">Create</Link>
              <a href="https://github.com/ace-step/ACE-Step-1.5" target="_blank" rel="noopener noreferrer" className="text-xl hover:text-foreground transition-colors" aria-label="GitHub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              </a>
            </div>
          </div>
          <div className="pt-8 text-center">
            <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest">
              Powered by ACE-Step. Open Source. MIT Licensed. © 2025 Riff.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
