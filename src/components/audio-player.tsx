"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { cn, formatDuration } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  onReset?: () => void;
  showActions?: boolean;
}

export function AudioPlayer({ src, onReset, showActions = true }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const setupAnalyser = useCallback(() => {
    if (!audioRef.current || sourceRef.current) return;

    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audioRef.current);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);

    ctxRef.current = ctx;
    sourceRef.current = source;
    analyserRef.current = analyser;
  }, []);

  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (document.hidden) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barCount = 48;
      const gap = 2;
      const barWidth = (width - gap * (barCount - 1)) / barCount;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] / 255;
        const barHeight = Math.max(2, value * height * 0.85);
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        ctx.fillStyle = `rgba(249, 115, 22, ${0.3 + value * 0.7})`;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    draw();
  }, []);

  const stopVisualizer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopVisualizer();
    };
  }, [stopVisualizer]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      stopVisualizer();
    } else {
      setupAnalyser();
      if (ctxRef.current?.state === "suspended") {
        await ctxRef.current.resume();
      }
      await audio.play();
      drawVisualizer();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = "riff.mp3";
    a.click();
  };

  return (
    <div className="w-full space-y-4">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={() =>
          setDuration(audioRef.current?.duration || 0)
        }
        onTimeUpdate={() =>
          setCurrentTime(audioRef.current?.currentTime || 0)
        }
        onEnded={() => {
          setIsPlaying(false);
          stopVisualizer();
        }}
      />

      {/* Visualizer */}
      <div className="relative h-20 w-full rounded-2xl glass overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]">
        <canvas
          ref={canvasRef}
          width={600}
          height={80}
          className="size-full"
        />
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-[3px] items-end h-8">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full bg-accent/15"
                  style={{
                    height: `${20 + Math.sin(i * 0.5) * 35 + ((i * 7 + 3) % 18)}%`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className={cn(
            "flex items-center justify-center size-12 rounded-full",
            "bg-accent text-white transition-all duration-200",
            "hover:scale-105 active:scale-95",
            "shadow-[0_2px_8px_rgba(249,115,22,0.3),0_4px_16px_rgba(249,115,22,0.15)]"
          )}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <rect x="3" y="2" width="4" height="14" rx="1" />
              <rect x="11" y="2" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <path d="M4 2.5a.5.5 0 0 1 .77-.42l11 7a.5.5 0 0 1 0 .84l-11 7A.5.5 0 0 1 4 16.5v-14z" />
            </svg>
          )}
        </button>

        <div className="flex-1 space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1"
            aria-label="Seek"
          />
          <div className="flex justify-between text-xs font-mono text-muted-foreground tabular-nums">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 glass glass-hover text-muted-foreground font-medium text-sm hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 2v9m0 0L4.5 7.5M8 11l3.5-3.5M2 13h12" />
            </svg>
            Download MP3
          </button>
          {onReset && (
            <button
              onClick={onReset}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 glass glass-hover text-muted-foreground font-medium text-sm hover:text-foreground"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 8a6 6 0 0 1 10.3-4.2M14 2v4h-4M14 8a6 6 0 0 1-10.3 4.2M2 14v-4h4" />
              </svg>
              Make another
            </button>
          )}
        </div>
      )}
    </div>
  );
}
