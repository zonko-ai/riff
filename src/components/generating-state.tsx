"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Composing your track...",
  "Arranging instruments...",
  "Mixing the beat...",
  "Adding the finishing touches...",
  "Almost there...",
];

export function GeneratingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-6 glass rounded-3xl">
      {/* Waveform skeleton */}
      <div className="flex items-end gap-[3px] h-16">
        {Array.from({ length: 32 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full bg-accent/40"
            style={{
              height: `${20 + Math.sin(i * 0.4) * 60}%`,
              animation: `pulse-dot 1.5s ease-in-out ${i * 0.05}s infinite`,
            }}
          />
        ))}
      </div>

      <p className="text-sm text-muted-foreground animate-in fade-in">
        {MESSAGES[messageIndex]}
      </p>

    </div>
  );
}
