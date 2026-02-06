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
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 4000);
    const tickInterval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => {
      clearInterval(msgInterval);
      clearInterval(tickInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 py-8 px-6 glass-elevated rounded-3xl">
      {/* Waveform skeleton */}
      <div className="flex items-end gap-1 h-14">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full bg-accent/40"
            style={{
              height: `${20 + Math.sin(i * 0.6) * 60}%`,
              animation: `pulse-dot 1.5s ease-in-out ${i * 0.1}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          {MESSAGES[messageIndex]}
        </p>
        <p className="text-xs text-muted-foreground/60 tabular-nums">
          {elapsed < 25
            ? "Usually takes about 30 seconds"
            : "Finishing up..."}
        </p>
      </div>
    </div>
  );
}
