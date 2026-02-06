"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Bollywood dance track",
  "Lo-fi study beat",
  "Acoustic folk",
];

export function HeroPrompt() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const handleSubmit = (prompt?: string) => {
    const text = (prompt ?? value).trim();
    if (!text) return;
    router.push(`/create?prompt=${encodeURIComponent(text)}`);
  };

  return (
    <div className="glass-elevated rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">TRY IT NOW</div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">
          <div className="size-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Live Model</span>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe your song idea..."
        rows={3}
        className="w-full rounded-xl glass-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none"
      />
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              setValue(suggestion);
              handleSubmit(suggestion);
            }}
            className={cn("glass-chip text-xs", "hover:text-foreground")}
          >
            {suggestion}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => handleSubmit()}
        className="w-full rounded-xl px-4 py-3 btn-primary text-white text-sm font-semibold flex items-center justify-center gap-2"
      >
        Generate two tracks
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
        </svg>
      </button>
    </div>
  );
}
