"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { VoiceMetadata } from "@/types/schema";
import { formatAudioDuration } from "@/lib/transcribeService";

interface VoiceBubbleProps {
  voice: VoiceMetadata;
  timestamp: number;
}

export const VoiceBubble: React.FC<VoiceBubbleProps> = ({ voice }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(voice.durationSeconds || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  // 18 waveform bar heights (editorial aesthetic)
  const barHeights = [40, 65, 30, 85, 55, 90, 70, 45, 80, 60, 95, 50, 75, 40, 60, 35, 50, 30];
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-2 max-w-[90%] sm:max-w-md">
      {/* Audio Player Card (Dark Editorial Surface) */}
      <div className="bg-[#1b2e23] border border-[rgba(78,135,102,0.4)] rounded-sm p-3.5 shadow-sm text-[#f3f0df]">
        {voice.audioUrl && (
          <audio ref={audioRef} src={voice.audioUrl} preload="metadata" />
        )}

        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
            className="w-10 h-10 rounded-full bg-[#4e8766] hover:bg-[#5ca37c] active:bg-[#3d7054] text-[#f3f0df] flex items-center justify-center transition-transform hover:scale-105 shrink-0 focus:outline-none focus:ring-2 focus:ring-[#62a57f]"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Waveform Visualization */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="h-7 flex items-center gap-[3px] overflow-hidden">
              {barHeights.map((h, i) => {
                const barProgress = (i / barHeights.length) * 100;
                const isPlayed = barProgress <= progressPercent;
                return (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`w-1 rounded-full transition-colors duration-100 ${
                      isPlayed
                        ? "bg-[#62a57f]"
                        : "bg-[rgba(243,240,223,0.2)]"
                    } ${isPlaying ? "animate-pulse" : ""}`}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-[rgba(243,240,223,0.5)] mt-1">
              <span>{formatAudioDuration(currentTime)}</span>
              <span>{formatAudioDuration(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Text Below Voice Bubble (Hinglish Codemix Display) */}
      <div className="bg-[#16201b] border border-[rgba(243,240,223,0.14)] p-3 rounded-sm text-xs font-sans space-y-1.5 shadow-sm">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#62a57f] uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            Sarvam STT • saaras:v3
          </span>
        </div>

        {/* Spoken Codemix Transcript */}
        <p className="text-sm text-[#f3f0df] italic leading-relaxed">
          &ldquo;{voice.codemixTranscript}&rdquo;
        </p>
      </div>
    </div>
  );
};
