"use client";

import { cn } from "@/lib/utils";

const GENRES = [
  { label: "Lo-fi", prompt: "chill lofi hip hop beat with soft piano and vinyl crackle" },
  { label: "Cinematic", prompt: "epic cinematic orchestral score with dramatic strings and brass" },
  { label: "Jazz", prompt: "smooth jazz trio with piano, upright bass, and brushed drums" },
  { label: "Electronic", prompt: "energetic electronic dance music with punchy synths and driving bass" },
  { label: "Ambient", prompt: "ethereal ambient soundscape with reverbed pads and soft textures" },
  { label: "Rock", prompt: "raw indie rock with distorted guitars, driving drums, and bass" },
  { label: "R&B", prompt: "smooth R&B with warm keys, 808 bass, and soulful melodies" },
  { label: "Classical", prompt: "elegant classical piano piece with expressive dynamics" },
] as const;

interface GenrePillsProps {
  selected: string | null;
  onSelect: (prompt: string, label: string) => void;
  disabled?: boolean;
}

export function GenrePills({ selected, onSelect, disabled }: GenrePillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {GENRES.map((genre) => (
        <button
          key={genre.label}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(genre.prompt, genre.label)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            "border border-border hover:border-accent/50 hover:text-accent",
            "disabled:opacity-40 disabled:pointer-events-none",
            selected === genre.label
              ? "border-accent bg-accent/10 text-accent"
              : "text-muted-foreground"
          )}
        >
          {genre.label}
        </button>
      ))}
    </div>
  );
}
