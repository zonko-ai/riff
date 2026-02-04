"use client";

import { cn } from "@/lib/utils";

const GENRES = [
  { label: "Lo-fi", prompt: "chill lofi hip hop beat with soft piano and vinyl crackle" },
  { label: "Pop", prompt: "catchy pop song with bright synths, punchy drums, and a sing-along melody" },
  { label: "Hip-Hop", prompt: "hard-hitting hip hop beat with 808 bass, crisp hi-hats, and trap drums" },
  { label: "Rock", prompt: "raw indie rock with distorted guitars, driving drums, and bass" },
  { label: "Jazz", prompt: "smooth jazz trio with piano, upright bass, and brushed drums" },
  { label: "Electronic", prompt: "energetic electronic dance music with punchy synths and driving bass" },
  { label: "R&B", prompt: "smooth R&B with warm keys, 808 bass, and soulful melodies" },
  { label: "Classical", prompt: "elegant classical piano piece with expressive dynamics" },
  { label: "Ambient", prompt: "ethereal ambient soundscape with reverbed pads and soft textures" },
  { label: "Cinematic", prompt: "epic cinematic orchestral score with dramatic strings and brass" },
  { label: "Metal", prompt: "heavy metal with aggressive distorted guitars, double kick drums, and powerful vocals" },
  { label: "Folk", prompt: "warm acoustic folk with fingerpicked guitar, soft harmonies, and gentle percussion" },
] as const;

interface GenrePillsProps {
  selected: string | null;
  onSelect: (prompt: string, label: string) => void;
  disabled?: boolean;
  filter?: string;
}

export function GenrePills({ selected, onSelect, disabled, filter }: GenrePillsProps) {
  const filtered = filter
    ? GENRES.filter((g) =>
        g.label.toLowerCase().includes(filter.toLowerCase())
      )
    : GENRES;

  return (
    <div className="flex flex-wrap gap-2">
      {filtered.map((genre) => (
        <button
          key={genre.label}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(genre.prompt, genre.label)}
          className={cn(
            "glass-chip",
            "disabled:opacity-40 disabled:pointer-events-none",
            selected === genre.label && "selected"
          )}
        >
          {genre.label}
        </button>
      ))}
    </div>
  );
}
