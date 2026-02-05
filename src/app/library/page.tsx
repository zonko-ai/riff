"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllTracks, LibraryTrack } from "@/lib/library";
import { Logo } from "@/components/logo";

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
              href="/create"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Create
            </Link>
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-balance">Your Library</h1>
              <p className="text-sm text-muted-foreground text-pretty">
                Stored locally in your browser.
              </p>
            </div>
            <Link
              href="/create"
              className="rounded-xl px-4 py-2 btn-primary text-white text-sm font-semibold"
            >
              Create new
            </Link>
          </div>

          {message && (
            <div className="text-sm text-muted-foreground">{message}</div>
          )}

          {tracks.length === 0 ? (
            <div className="glass rounded-3xl p-10 text-center space-y-3">
              <h2 className="text-xl font-semibold">No tracks saved yet</h2>
              <p className="text-sm text-muted-foreground text-pretty">
                Generate your first tracks and they will appear here automatically.
              </p>
              <Link
                href="/create"
                className="inline-flex rounded-xl px-4 py-2 btn-primary text-white text-sm font-semibold"
              >
                Create your first track
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {tracks.map((track) => (
                <div key={track.id} className="glass rounded-3xl p-6 space-y-4">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase">Track</div>
                    <div className="text-lg font-semibold text-balance">{track.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(track.duration)}s · {new Date(track.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <audio controls className="w-full">
                    <source src={audioUrls[track.id]} type="audio/mpeg" />
                  </audio>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={audioUrls[track.id]}
                      download={`${track.title}.mp3`}
                      className="rounded-full px-3 py-1.5 glass glass-hover text-xs text-muted-foreground"
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => handleShare(track)}
                      className="rounded-full px-3 py-1.5 glass glass-hover text-xs text-muted-foreground"
                    >
                      Share
                    </button>
                  </div>

                  <details className="text-sm text-muted-foreground">
                    <summary className="cursor-pointer">Prompt &amp; Lyrics</summary>
                    <div className="mt-2 space-y-2">
                      <div>
                        <div className="text-xs uppercase">Prompt</div>
                        <p className="text-sm text-muted-foreground text-pretty">
                          {track.caption}
                        </p>
                      </div>
                      <div>
                        <div className="text-xs uppercase">Lyrics</div>
                        <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono">
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
    </div>
  );
}
