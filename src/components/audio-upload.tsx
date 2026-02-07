"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AudioUploadProps {
  label: string;
  description?: string;
  onUpload: (path: string, fileName: string) => void;
  onRemove: () => void;
  uploadedFileName?: string;
  isUploading?: boolean;
}

const ACCEPT = ".mp3,.wav,.flac,.ogg,.m4a";
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export function AudioUpload({
  label,
  description,
  onUpload,
  onRemove,
  uploadedFileName,
  isUploading,
}: AudioUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = uploading || isUploading;

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (file.size > MAX_SIZE) {
        setError("File too large (max 50MB)");
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["mp3", "wav", "flac", "ogg", "m4a"].includes(ext)) {
        setError("Unsupported format. Use MP3, WAV, FLAC, OGG, or M4A.");
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Upload failed");
        }

        const data = await res.json();
        onUpload(data.path, file.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so re-selecting the same file works
      e.target.value = "";
    },
    [handleFile]
  );

  if (uploadedFileName) {
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </label>
        <div className="flex items-center gap-3 glass-subtle rounded-xl px-4 py-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent shrink-0"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <span className="text-sm text-foreground truncate flex-1">
            {uploadedFileName}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !busy && inputRef.current?.click()}
        className={cn(
          "rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors",
          dragOver
            ? "border-accent bg-accent/5"
            : "border-white/10 hover:border-white/20",
          busy && "opacity-50 cursor-wait"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleChange}
          className="hidden"
        />
        {busy ? (
          <div className="flex flex-col items-center gap-2">
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
            <span className="text-xs text-muted-foreground">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-xs text-muted-foreground">
              Drop audio here or click to browse
            </span>
            <span className="text-[10px] text-muted-foreground/50">
              MP3, WAV, FLAC, OGG, M4A — max 50MB
            </span>
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
