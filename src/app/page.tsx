import Link from "next/link";
import { Logo } from "@/components/logo";
import { HeroPrompt } from "@/components/hero-prompt";

export const metadata = {
  title: "Riff — Free Open-Source Music Generator",
  description:
    "Riff is the best free open-source music generation platform. Describe the music in your head and get two distinct tracks instantly.",
};

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background relative">
      <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden="true">
        <svg className="w-full h-full text-black/10" viewBox="0 0 800 800">
          <defs>
            <pattern id="riff-dots" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="800" height="800" fill="url(#riff-dots)" />
        </svg>
      </div>
      <div className="pointer-events-none absolute -top-16 left-1/2 w-full max-w-4xl -translate-x-1/2 opacity-30" aria-hidden="true">
        <svg viewBox="0 0 720 200" className="w-full h-full text-accent/40">
          <path
            d="M10 120c60-80 140-90 210-30 50 40 120 60 200 40 80-20 140-70 260-20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M30 160c70-50 160-40 230 10 60 40 130 50 210 20 70-30 120-60 210-30"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="relative">
        <header className="px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-accent text-white flex items-center justify-center shadow-[0_2px_8px_rgba(249,115,22,0.25)]">
              <Logo showText={false} className="text-white" />
            </div>
            <div>
              <div className="text-lg font-semibold font-display">Riff</div>
              <div className="text-xs text-muted-foreground">Open-source music generator</div>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/library"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Library
            </Link>
            <a
              href="https://github.com/ace-step/ACE-Step-1.5"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <Link
              href="/create"
              className="rounded-xl px-4 py-2 btn-primary text-white text-sm font-semibold"
            >
              Create for free
            </Link>
          </div>
        </div>
      </header>

      <main className="px-6 pb-16">
        <section className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/60 border border-black/10 px-4 py-1.5 text-xs text-muted-foreground">
              100% free, open-source, saved locally
            </div>
            <h1 className="font-display tracking-tight text-balance leading-[1.2]" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.75rem)' }}>
              The best free open-source music generation platform.
            </h1>
            <p className="text-[17px] text-muted-foreground text-pretty font-body leading-relaxed">
              Describe the music in your head and Riff will generate two distinct tracks so you
              can instantly choose the best take. Smart mode for speed, Pro mode for total
              control.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/create"
                className="rounded-xl px-6 py-3.5 btn-primary text-white text-sm font-semibold"
              >
                Create your first track
              </Link>
              <a
                href="https://github.com/ace-step/ACE-Step-1.5"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl px-6 py-3.5 glass glass-hover text-sm text-muted-foreground font-semibold"
              >
                View the model
              </a>
            </div>
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div className="glass-subtle rounded-2xl p-4">
                <div className="text-xs text-muted-foreground tracking-wide uppercase">Smart mode</div>
                <div className="font-semibold">From idea to audio in minutes</div>
              </div>
              <div className="glass-subtle rounded-2xl p-4">
                <div className="text-xs text-muted-foreground tracking-wide uppercase">Pro mode</div>
                <div className="font-semibold">BPM, key, lyrics, language, seed</div>
              </div>
              <div className="glass-subtle rounded-2xl p-4">
                <div className="text-xs text-muted-foreground tracking-wide uppercase">Two-track engine</div>
                <div className="font-semibold">Always get A/B versions</div>
              </div>
            </div>
          </div>

          <div className="relative space-y-5">
            <div className="absolute inset-0 pointer-events-none">
              <svg
                viewBox="0 0 400 400"
                className="w-full h-full text-accent/10"
                aria-hidden="true"
              >
                <path
                  d="M20 120c50-80 120-90 180-30 40 40 90 60 150 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <path
                  d="M40 260c60-40 140-30 190 20 40 40 90 50 140 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <HeroPrompt />
            <div className="glass-elevated rounded-3xl p-7 space-y-5 relative">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Prompt</div>
                <div className="text-xs text-muted-foreground">Smart</div>
              </div>
              <div className="rounded-2xl border border-black/10 px-4 py-3 text-sm text-muted-foreground font-body">
                Dreamy Hindi love song with soft synths, warm strings, and a gentle chorus.
              </div>
              <div className="grid gap-4">
                <div className="glass-subtle rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground">Track A</div>
                  <div className="font-semibold">Warm synth ballad</div>
                  <div className="text-xs text-muted-foreground">0:42 · Vocal</div>
                </div>
                <div className="glass-subtle rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground">Track B</div>
                  <div className="font-semibold">Acoustic reimagining</div>
                  <div className="text-xs text-muted-foreground">0:46 · Vocal</div>
                </div>
              </div>
              <Link
                href="/create"
                className="w-full flex items-center justify-center rounded-xl px-4 py-2 btn-primary text-white text-sm font-semibold"
              >
                Try it now
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto mt-24 grid gap-6 md:grid-cols-2">
          <div className="glass-elevated rounded-3xl p-9 space-y-4">
            <h2 className="text-2xl font-display tracking-tight text-balance">Smart mode</h2>
            <p className="text-[15px] text-muted-foreground text-pretty font-body">
              Describe the song in plain English and let Riff write lyrics, choose the vibe,
              and deliver two takes instantly.
            </p>
            <ul className="text-[15px] text-muted-foreground space-y-2">
              <li>Auto-generated lyrics with section markers</li>
              <li>Quick vibe selection + duration control</li>
              <li>Instant A/B comparison for faster picks</li>
            </ul>
          </div>
          <div className="glass-elevated rounded-3xl p-9 space-y-4">
            <h2 className="text-2xl font-display tracking-tight text-balance">Pro mode</h2>
            <p className="text-[15px] text-muted-foreground text-pretty font-body">
              Dial in BPM, key, time signature, language, seeds, tags, and lyrics. Generate a
              bold alternate every time.
            </p>
            <ul className="text-[15px] text-muted-foreground space-y-2">
              <li>Style + negative tags for precision</li>
              <li>Seed control for reproducible takes</li>
              <li>Optional alternate lyrics for Track B</li>
            </ul>
          </div>
        </section>

        <section className="max-w-6xl mx-auto mt-24 grid gap-6 md:grid-cols-3">
          <div className="glass rounded-3xl p-7 space-y-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Two-track engine</div>
            <div className="text-lg font-semibold">Never settle on one take.</div>
            <p className="text-[15px] text-muted-foreground text-pretty font-body">
              Every generation returns two distinct versions so you can pick the one that hits.
            </p>
          </div>
          <div className="glass rounded-3xl p-7 space-y-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Open-source</div>
            <div className="text-lg font-semibold">Built in the open.</div>
            <p className="text-[15px] text-muted-foreground text-pretty font-body">
              Riff is powered by ACE-Step v1.5 and stays transparent about how the music is made.
            </p>
          </div>
          <div className="glass rounded-3xl p-7 space-y-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Privacy-first</div>
            <div className="text-lg font-semibold">Saved locally.</div>
            <p className="text-[15px] text-muted-foreground text-pretty font-body">
              Your prompts and generations stay in your browser. No accounts required to create.
            </p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto mt-24">
          <div className="glass-elevated rounded-3xl p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-display tracking-tight text-balance">Start generating now</h2>
              <p className="text-[15px] text-muted-foreground text-pretty font-body">
                The best free open-source music generator. Two tracks, every time.
              </p>
            </div>
            <Link
              href="/create"
              className="rounded-xl px-6 py-3.5 btn-primary text-white text-sm font-semibold"
            >
              Create for free
            </Link>
          </div>
        </section>
      </main>

      <footer className="px-6 py-10 border-t border-black/[0.04]">
        <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-3 text-sm text-muted-foreground">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-accent text-white flex items-center justify-center">
                <Logo showText={false} className="text-white" />
              </div>
              <span className="font-semibold font-display text-foreground">Riff</span>
            </div>
            <p className="text-[13px]">Free &amp; open-source music generation.</p>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.05em] text-muted-foreground/60">Links</div>
            <div className="flex flex-col gap-1.5 text-[13px]">
              <a href="https://github.com/ace-step/ACE-Step-1.5" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
              <span>MIT License</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.05em] text-muted-foreground/60">Built with</div>
            <p className="text-[13px]">ACE-Step v1.5</p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
