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
    <div className="min-h-dvh bg-background relative font-body">
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
        {/* Hero — centered single column */}
        <section className="max-w-4xl mx-auto text-center space-y-6 pt-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 border border-black/10 px-4 py-1.5 text-xs text-muted-foreground">
            100% free, open-source, saved locally
          </div>
          <h1 className="font-display tracking-tight text-balance leading-[1.2]" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.75rem)' }}>
            The best free open-source music generation platform.
          </h1>
          <p className="text-[17px] text-muted-foreground text-pretty font-body leading-relaxed max-w-2xl mx-auto">
            Describe the music in your head and Riff will generate two distinct tracks so you
            can instantly choose the best take. Smart mode for speed, Pro mode for total
            control.
          </p>
          <div>
            <Link
              href="/create"
              className="inline-flex rounded-xl px-6 py-3.5 btn-primary text-white text-sm font-semibold"
            >
              Create your first track
            </Link>
          </div>
        </section>

        {/* HeroPrompt — centered below */}
        <section className="max-w-2xl mx-auto mt-12">
          <HeroPrompt />
        </section>

        {/* 3 feature cards — horizontal row */}
        <section className="max-w-4xl mx-auto mt-12 grid gap-4 md:grid-cols-3 text-sm">
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
              <Link href="/library" className="hover:text-accent transition-colors">Library</Link>
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
    </div>
  );
}
