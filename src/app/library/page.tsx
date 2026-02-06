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
      <header className="px-6 py-6 sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-black/[0.04]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-accent text-white flex items-center justify-center shadow-[0_4px_12px_rgba(249,115,22,0.25)]">
              <Logo showText={false} className="text-white" />
            </div>
            <span className="text-xl font-bold font-display tracking-tight">Riff</span>
          </Link>
          <div className="flex items-center gap-8 text-sm">
            <Link
              href="/create"
              className="font-medium text-muted-foreground hover:text-accent transition-colors"
            >
              Create
            </Link>
            <Link
              href="/"
              className="font-medium text-muted-foreground hover:text-accent transition-colors"
            >
              Home
            </Link>
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
              href="/create"
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
            <div className="glass-elevated rounded-3xl p-12 text-center space-y-4">
              <div className="size-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
              </div>
              <h2 className="text-xl font-semibold font-display">No tracks saved yet</h2>
              <p className="text-[15px] text-muted-foreground text-pretty max-w-sm mx-auto">
                Generate your first tracks and they will appear here automatically.
              </p>
              <Link
                href="/create"
                className="inline-flex rounded-xl px-6 py-3 btn-primary text-white text-sm font-semibold gap-2"
              >
                Create your first track
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {tracks.map((track) => (
                <div key={track.id} className="glass-elevated rounded-2xl p-4 md:p-6 space-y-4">
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="size-14 md:size-16 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <svg width="24" height="24" viewBox="0 0 18 18" fill="currentColor"><path d="M4 2.5a.5.5 0 0 1 .77-.42l11 7a.5.5 0 0 1 0 .84l-11 7A.5.5 0 0 1 4 16.5v-14z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg md:text-xl font-bold truncate">{track.title}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-black/5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">MP3</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{track.caption}</p>
                    </div>
                    <div className="hidden md:flex flex-col items-end shrink-0">
                      <span className="font-mono font-medium">{Math.round(track.duration)}s</span>
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
                        {new Date(track.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <AudioPlayer src={audioUrls[track.id]} />

                  <div className="flex flex-wrap gap-2">
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
                  </div>

                  <details className="text-sm text-muted-foreground group">
                    <summary className="cursor-pointer flex items-center gap-1.5">
                      <svg
                        width="12"
                        height="12"
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
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground/60">Lyrics</div>
                        <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono mt-1">
                          {track.lyrics}
                        </pre>
                      </div>
                    </div>
                  </details>
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
              <a href="https://github.com/ace-step/ACE-Step-1.5" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">Documentation</a>
              <Link href="/" className="hover:text-accent transition-colors">Privacy Policy</Link>
              <span className="px-2 py-1 bg-black/5 rounded text-[11px] font-mono">v1.5.0</span>
              <a href="https://github.com/ace-step/ACE-Step-1.5" target="_blank" rel="noopener noreferrer" className="text-xl hover:text-foreground transition-colors" aria-label="GitHub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              </a>
            </div>
          </div>
          <div className="pt-8 text-center">
            <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest">
              Built with ACE-Step. Open Source. MIT Licensed. © 2024 Riff AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
