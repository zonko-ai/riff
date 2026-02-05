"use client";

interface QueueStatusProps {
  position: number;
  status: "queued" | "generating";
  onCancel: () => void;
}

export function QueueStatus({ position, status, onCancel }: QueueStatusProps) {
  if (status === "generating") {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4 py-8 px-6 glass rounded-3xl">
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="size-1.5 rounded-full bg-accent"
              style={{
                animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {position - 1 === 1
            ? "1 person ahead of you"
            : `${position - 1} people ahead of you`}
        </p>
      </div>

      <p className="text-xs text-muted-foreground/70">
        Estimated wait ~{(position - 1) * 30}s
      </p>

      <button
        onClick={onCancel}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2 px-4 rounded-xl glass glass-hover"
      >
        Leave queue
      </button>
    </div>
  );
}
