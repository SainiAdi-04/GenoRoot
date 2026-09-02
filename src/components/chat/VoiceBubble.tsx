"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Volume2, Loader2, Square } from "lucide-react";
import { VoiceMetadata } from "@/types/schema";
import { formatAudioDuration } from "@/lib/transcribeService";
import { tts } from "@/lib/ttsService";

interface VoiceBubbleProps {
  voice: VoiceMetadata;
  timestamp: number;
}

export const VoiceBubble: React.FC<VoiceBubbleProps> = ({ voice }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isTtsPlaying, setIsTtsPlaying] = useState<boolean>(false);
  const [isTtsLoading, setIsTtsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(
    voice.durationSeconds && isFinite(voice.durationSeconds) ? voice.durationSeconds : 0
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Convert base64 data URLs to native blob URLs for reliable range-request demuxing in Chromium
  const playableUrl = useMemo(() => {
    if (!voice.audioUrl) return "";
    if (typeof window === "undefined") return voice.audioUrl;
    if (voice.audioUrl.startsWith("data:")) {
      try {
        const parts = voice.audioUrl.split(",");
        const header = parts[0] || "";
        const base64Data = parts[1] || "";
        const mimeMatch = header.match(/:(.*?);/);
        const baseMime = mimeMatch ? mimeMatch[1] : "audio/webm";
        const fullMime = baseMime.includes("codecs")
          ? baseMime
          : baseMime.includes("webm")
          ? "audio/webm;codecs=opus"
          : baseMime;

        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: fullMime });
        return URL.createObjectURL(blob);
      } catch (err) {
        console.warn("Could not create object URL from data URL:", err);
        return voice.audioUrl;
      }
    }
    return voice.audioUrl;
  }, [voice.audioUrl]);

  useEffect(() => {
    return () => {
      if (playableUrl.startsWith("blob:")) {
        URL.revokeObjectURL(playableUrl);
      }
    };
  }, [playableUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const effectiveDuration = duration > 0 ? duration : (voice.durationSeconds || 0);
      if (effectiveDuration > 0 && audio.currentTime >= effectiveDuration) {
        setIsPlaying(false);
        audio.pause();
        audio.currentTime = 0;
        setCurrentTime(0);
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration) && !isNaN(audio.duration) && audio.duration > 0) {
        setDuration(Math.round(audio.duration));
      } else if (voice.durationSeconds && isFinite(voice.durationSeconds) && voice.durationSeconds > 0) {
        setDuration(voice.durationSeconds);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audio) {
        audio.currentTime = 0;
      }
    };

    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
    };
  }, [duration, voice.durationSeconds]);

  // Ensure volume is maximized and apply Web Audio gain boost for quiet microphone recordings
  const ensureAudibility = (audio: HTMLAudioElement) => {
    audio.volume = 1.0;
    audio.muted = false;

    if (typeof window === "undefined") return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      if (!audioCtxRef.current) {
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaElementSource(audio);
        const gainNode = ctx.createGain();
        // Boost quiet mic recordings by 2.5x (+8 dB) so voice is crisp and audible
        gainNode.gain.value = 2.5;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    } catch {
      // MediaElementSource might already be connected
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      ensureAudibility(audio);
      const effectiveDuration = duration > 0 ? duration : (voice.durationSeconds || 0);
      // Rewind to beginning if at or near the end so replay works every time
      if (audio.ended || (effectiveDuration > 0 && audio.currentTime >= effectiveDuration - 0.2)) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Audio playback error:", err);
          setIsPlaying(false);
        });
    }
  };

  const handleSeek = (index: number) => {
    const audio = audioRef.current;
    const effectiveDuration = duration > 0 ? duration : (voice.durationSeconds || 0);
    if (!audio || effectiveDuration <= 0) return;
    const targetTime = (index / barHeights.length) * effectiveDuration;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  // 18 waveform bar heights (editorial aesthetic)
  const barHeights = [40, 65, 30, 85, 55, 90, 70, 45, 80, 60, 95, 50, 75, 40, 60, 35, 50, 30];
  const effectiveDuration = duration > 0 ? duration : (voice.durationSeconds || 0);
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  return (
    <div className="space-y-2 max-w-[90%] sm:max-w-md">
      {/* Audio Player Card (Dark Editorial Surface) */}
      <div className="bg-[#1b2e23] border border-[rgba(78,135,102,0.4)] rounded-sm p-3.5 shadow-sm text-[#f3f0df]">
        {(playableUrl || voice.audioUrl) && (
          <audio ref={audioRef} src={playableUrl || voice.audioUrl} preload="auto" />
        )}

        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
            className="w-10 h-10 rounded-full bg-[#4e8766] hover:bg-[#5ca37c] active:bg-[#3d7054] text-[#f3f0df] flex items-center justify-center transition-transform hover:scale-105 shrink-0 focus:outline-none focus:ring-2 focus:ring-[#62a57f] cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Waveform Visualization with Click-to-Seek */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="h-7 flex items-center gap-[3px] overflow-hidden">
              {barHeights.map((h, i) => {
                const barProgress = (i / barHeights.length) * 100;
                const isPlayed = barProgress <= progressPercent;
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => handleSeek(i)}
                    aria-label={`Seek to ${Math.round((i / barHeights.length) * effectiveDuration)}s`}
                    style={{ height: `${h}%` }}
                    className={`w-1 rounded-full transition-colors duration-100 cursor-pointer ${
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
              <span>{formatAudioDuration(effectiveDuration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Text Below Voice Bubble (Hinglish Codemix Display) */}
      <div className="bg-[#16201b] border border-[rgba(243,240,223,0.14)] p-3 rounded-sm text-xs font-sans space-y-1.5 shadow-sm">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#62a57f] uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            Voice Note • Transcribed
          </span>

          <button
            type="button"
            onClick={() => {
              if (isTtsPlaying) {
                tts.stop();
                setIsTtsPlaying(false);
                setIsTtsLoading(false);
                return;
              }

              const textToSpeak = voice.codemixTranscript || voice.translateTranscript || "";
              if (textToSpeak) {
                setIsTtsLoading(true);
                tts.speak(textToSpeak, {
                  onStart: () => {
                    setIsTtsLoading(false);
                    setIsTtsPlaying(true);
                  },
                  onEnd: () => {
                    setIsTtsLoading(false);
                    setIsTtsPlaying(false);
                  },
                  onError: () => {
                    setIsTtsLoading(false);
                    setIsTtsPlaying(false);
                  },
                });
              }
            }}
            title={isTtsPlaying ? "Stop audio" : "Read this transcript aloud using Sarvam AI"}
            className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
              isTtsPlaying
                ? "bg-[#1f3328] text-[#4ade80] border-[#62a57f]"
                : isTtsLoading
                ? "bg-[#232918] text-[#fcd34d] border-[#d97706]"
                : "text-[#a7f3d0] hover:text-[#f3f0df] bg-[#1f2e27] border-[rgba(78,135,102,0.3)]"
            }`}
          >
            {isTtsLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-[#fcd34d]" />
                <span>Loading…</span>
              </>
            ) : isTtsPlaying ? (
              <>
                <Square className="w-2.5 h-2.5 fill-current text-[#4ade80]" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3 text-[#4ade80]" />
                <span>Listen</span>
              </>
            )}
          </button>
        </div>

        {/* Spoken Codemix Transcript */}
        <p className="text-sm text-[#f3f0df] italic leading-relaxed">
          &ldquo;{voice.codemixTranscript}&rdquo;
        </p>
      </div>
    </div>
  );
};
