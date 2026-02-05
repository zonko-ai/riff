"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Dreamy Hindi love song with soft synths and warm strings",
  "Upbeat Bollywood dance track with punchy drums",
  "Lo-fi study beat with mellow piano and vinyl crackle",
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
    <div className="glass rounded-3xl p-5 space-y-4">
      <div className="text-xs text-muted-foreground uppercase">Try it now</div>
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
        className="w-full rounded-xl px-4 py-2 btn-primary text-white text-sm font-semibold"
      >
        Generate two tracks
      </button>
    </div>
  );
}
