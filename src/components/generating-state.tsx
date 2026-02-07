"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Composing your track...",
  "Arranging instruments...",
  "Mixing the beat...",
  "Adding the finishing touches...",
  "Almost there...",
];

const ESTIMATED_DURATION = 35;

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

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timerStr = `${minutes}:${String(seconds).padStart(2, "0")}`;
  const progress = Math.min(elapsed / ESTIMATED_DURATION, 1);

  return (
    <div className="flex flex-col items-center gap-5 py-8 px-6 glass-elevated rounded-3xl">
      {/* Waveform skeleton */}
      <div className="flex items-end gap-[3px] h-14">
        {Array.from({ length: 24 }).map((_, i) => {
          const baseHeight = 20 + Math.sin(i * 0.5) * 40 + ((i * 7 + 3) % 25);
          return (
            <div
              key={i}
              className="rounded-full bg-accent/40"
              style={{
                width: `${i % 3 === 0 ? 5 : i % 2 === 0 ? 4 : 3}px`,
                height: `${baseHeight}%`,
                animation: `pulse-dot 1.5s ease-in-out ${i * 0.08}s infinite`,
              }}
            />
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs h-1 rounded-full bg-black/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent/40 transition-[width] duration-1000 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          {MESSAGES[messageIndex]}
        </p>
        <p className="text-xs text-muted-foreground/60 tabular-nums font-mono">
          {timerStr}
        </p>
      </div>
    </div>
  );
}
