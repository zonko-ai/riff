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
              <div className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">OPEN-SOURCE MUSIC GENERATOR</div>
            </div>
          </Link>
          <div className="flex items-center gap-6">
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
                <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-1">Smart mode</div>
                <div className="font-semibold">From idea to audio in minutes</div>
              </div>
              <div className="glass-subtle rounded-2xl p-4">
                <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-1">Pro mode</div>
                <div className="font-semibold">BPM, key, lyrics, seed control</div>
              </div>
              <div className="glass-subtle rounded-2xl p-4">
                <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-1">Two-track engine</div>
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
            {/* Demo card */}
            <div className="glass-elevated rounded-3xl p-7 space-y-5 relative">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">LATEST GENERATION</div>
                <div className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-md bg-black/5">Smart Mode</div>
              </div>
              <div className="rounded-2xl border border-black/[0.06] bg-black/[0.02] px-5 py-4 text-sm text-muted-foreground font-body italic">
                &ldquo;Dreamy Hindi love song with soft synths, warm strings, and a gentle chorus.&rdquo;
              </div>
              <div className="grid gap-3">
                {/* Track A */}
                <div className="glass-subtle rounded-2xl p-4 flex items-center gap-4 border-l-4 border-l-accent">
                  <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shadow-sm shrink-0">
                    <svg width="14" height="14" viewBox="0 0 18 18" fill="currentColor"><path d="M4 2.5a.5.5 0 0 1 .77-.42l11 7a.5.5 0 0 1 0 .84l-11 7A.5.5 0 0 1 4 16.5v-14z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Track A</div>
                    <div className="font-semibold text-sm">Warm synth ballad</div>
                  </div>
                  <div className="text-[11px] font-medium text-muted-foreground shrink-0">0:42 · Vocal</div>
                </div>
                {/* Track B */}
                <div className="glass-subtle rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-black/5 text-muted-foreground flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 18 18" fill="currentColor"><rect x="3" y="2" width="4" height="14" rx="1" /><rect x="11" y="2" width="4" height="14" rx="1" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Track B</div>
                    <div className="font-semibold text-sm">Acoustic reimagining</div>
                  </div>
                  <div className="text-[11px] font-bold text-accent flex items-center gap-1.5 shrink-0">
                    <div className="size-1.5 rounded-full bg-accent animate-pulse" />
                    Now Playing
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Smart / Pro info cards */}
        <section className="max-w-6xl mx-auto mt-24 grid gap-6 md:grid-cols-2">
          <div className="glass-elevated rounded-3xl p-9 space-y-4">
            <div className="size-10 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            </div>
            <h2 className="text-2xl font-display tracking-tight text-balance">Smart mode</h2>
            <p className="text-[15px] text-muted-foreground text-pretty font-body leading-relaxed">
              Describe the song in plain English and let Riff write lyrics, choose the vibe,
              and deliver two takes instantly.
            </p>
            <ul className="text-[15px] text-muted-foreground space-y-3 font-body">
              <li className="flex items-start gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
                Auto-generated lyrics with section markers
              </li>
              <li className="flex items-start gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
                Quick vibe selection + duration control
              </li>
              <li className="flex items-start gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
                Instant A/B comparison for faster picks
              </li>
            </ul>
          </div>
          <div className="glass-elevated rounded-3xl p-9 space-y-4">
            <div className="size-10 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="4" y1="21" y2="14" /><line x1="4" x2="4" y1="10" y2="3" /><line x1="12" x2="12" y1="21" y2="12" /><line x1="12" x2="12" y1="8" y2="3" /><line x1="20" x2="20" y1="21" y2="16" /><line x1="20" x2="20" y1="12" y2="3" /><line x1="2" x2="6" y1="14" y2="14" /><line x1="10" x2="14" y1="8" y2="8" /><line x1="18" x2="22" y1="16" y2="16" /></svg>
            </div>
            <h2 className="text-2xl font-display tracking-tight text-balance">Pro mode</h2>
            <p className="text-[15px] text-muted-foreground text-pretty font-body leading-relaxed">
              Dial in BPM, key, time signature, language, seeds, tags, and lyrics. Generate a
              bold alternate every time.
            </p>
            <ul className="text-[15px] text-muted-foreground space-y-3 font-body">
              <li className="flex items-start gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
                Style + negative tags for precision
              </li>
              <li className="flex items-start gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
                Seed control for reproducible takes
              </li>
              <li className="flex items-start gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
                Optional alternate lyrics for Track B
              </li>
            </ul>
          </div>
        </section>

        {/* Three-column feature cards */}
        <section className="max-w-6xl mx-auto mt-24 grid gap-6 md:grid-cols-3">
          <div className="glass rounded-3xl p-8 space-y-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Two-track engine</div>
            <div className="text-lg font-semibold font-display">No more re-rolling single tracks.</div>
            <p className="text-[15px] text-muted-foreground text-pretty font-body">
              Every generation returns two distinct versions so you can pick the one that hits.
            </p>
          </div>
          <div className="glass rounded-3xl p-8 space-y-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Open-source</div>
            <div className="text-lg font-semibold font-display">Fork it on GitHub anytime.</div>
            <p className="text-[15px] text-muted-foreground text-pretty font-body">
              Riff is powered by ACE-Step v1.5 and stays transparent about how the music is made.
            </p>
          </div>
          <div className="glass rounded-3xl p-8 space-y-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Privacy-first</div>
            <div className="text-lg font-semibold font-display">Your data is yours alone.</div>
            <p className="text-[15px] text-muted-foreground text-pretty font-body">
              Your prompts and generations stay in your browser. No accounts required to create.
            </p>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-6xl mx-auto mt-24">
          <div className="rounded-[2.5rem] p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8 bg-[#1A1A2E] shadow-2xl">
            <div className="space-y-3">
              <h2 className="text-4xl font-display tracking-tight text-white">Start generating now</h2>
              <p className="text-lg text-white/70 text-pretty font-body">
                The best free open-source music generator. Two tracks, every time.
              </p>
            </div>
            <Link
              href="/create"
              className="rounded-2xl px-10 py-5 btn-primary text-white text-base font-semibold text-center flex items-center justify-center gap-3"
            >
              Create for free
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-16 border-t border-black/[0.04] mt-12">
        <div className="max-w-6xl mx-auto">
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
              <Link href="/library" className="hover:text-accent transition-colors">Privacy Policy</Link>
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
    </div>
  );
}
