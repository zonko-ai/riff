"use client";

import { cn } from "@/lib/utils";

interface QueueStatusProps {
  position: number;
  status: "queued" | "generating";
  onCancel: () => void;
}

export function QueueStatus({ position, status, onCancel }: QueueStatusProps) {
  if (status === "generating") {
    return null; // Handled by GeneratingState
  }

  return (
    <div className="flex flex-col items-center gap-5 py-8">
      {/* Position circle */}
      <div className="relative flex items-center justify-center">
        <svg className="size-24" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted"
          />
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-accent"
            strokeDasharray={`${(1 / Math.max(position, 1)) * 264} 264`}
            strokeLinecap="round"
            transform="rotate(-90 48 48)"
            style={{ transition: "stroke-dasharray 0.5s ease-out" }}
          />
        </svg>
        <span className="absolute text-2xl font-bold tabular-nums text-accent">
          #{position}
        </span>
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">
          You&apos;re #{position} in line
        </p>
        <p className="text-xs text-muted-foreground">
          {position === 1
            ? "You're next — starting soon"
            : `${position - 1} ${position - 1 === 1 ? "person" : "people"} ahead of you`}
        </p>
      </div>

      {/* Pulsing dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="size-1.5 rounded-full bg-accent"
            style={{
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <button
        onClick={onCancel}
        className={cn(
          "text-sm text-muted-foreground hover:text-foreground transition-colors py-2 px-4",
          "rounded-lg hover:bg-muted/50"
        )}
      >
        Leave queue
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
