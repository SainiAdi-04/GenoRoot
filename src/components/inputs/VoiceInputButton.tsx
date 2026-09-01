"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, X, AlertCircle } from "lucide-react";
import { VoiceInputPayload } from "@/types/schema";
import { formatAudioDuration } from "@/lib/transcribeService";

export interface VoiceInputButtonProps {
  questionId: string;
  onVoiceSubmitted: (payload: VoiceInputPayload) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  questionId,
  onVoiceSubmitted,
  onProcessingChange,
  disabled = false,
  label = "Tap mic to speak Hinglish",
}) => {
  const [status, setStatus] = useState<"idle" | "recording" | "transcribing">("idle");
  const [duration, setDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const getMimeType = () => {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
      return "";
    }
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/aac",
      "audio/ogg",
      "audio/wav",
    ];
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return "";
  };

  const startRecording = async () => {
    setErrorMessage(null);

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setErrorMessage("Microphone is not supported in this browser. Please type your answer.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const finalDuration = duration;
        const audioUrl = URL.createObjectURL(audioBlob);

        setStatus("transcribing");
        onProcessingChange?.(true);

        try {
          const formData = new FormData();
          const ext = mimeType.includes("mp4") ? "mp4" : "webm";
          formData.append("file", audioBlob, `speech.${ext}`);
          formData.append("questionId", questionId);

          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();

          if (data.success && data.codemix) {
            onVoiceSubmitted({
              audioUrl,
              durationSeconds: Math.max(1, finalDuration),
              codemix: data.codemix,
              translate: data.translate || data.codemix,
              isFallback: data.isFallback,
            });
            setStatus("idle");
          } else {
            setErrorMessage(data.error || "Unable to transcribe voice note. Please type your response.");
            setStatus("idle");
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Network error during transcription";
          setErrorMessage(`Transcription failed: ${msg}. Please type your response.`);
          setStatus("idle");
        } finally {
          onProcessingChange?.(false);
        }
      };

      mediaRecorder.start(250);
      setStatus("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone permission was denied. Please allow microphone access or type your answer."
          : "Could not access microphone. Please type your answer.";
      setErrorMessage(msg);
      setStatus("idle");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    chunksRef.current = [];
    setStatus("idle");
    setDuration(0);
    onProcessingChange?.(false);
  };

  const handleMicClick = () => {
    if (status === "recording") {
      stopRecording();
    } else if (status === "idle") {
      startRecording();
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between p-3 bg-[#18241e] border border-[rgba(78,135,102,0.3)] rounded-sm">
        {/* Left Side: Mic Action Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={disabled || status === "transcribing"}
            onClick={handleMicClick}
            aria-label={
              status === "recording"
                ? "Stop recording voice note"
                : "Record voice note in Hinglish"
            }
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#62a57f] cursor-pointer ${
              status === "recording"
                ? "bg-[#c2410c] hover:bg-[#9a3412] text-[#f3f0df] ring-2 ring-[#c2410c] ring-offset-2 ring-offset-[#111814] scale-105 animate-pulse"
                : "bg-[#4e8766] hover:bg-[#5ca37c] active:bg-[#3d7054] text-[#f3f0df] shadow-sm hover:scale-105"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {status === "recording" ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <Mic className="w-5 h-5 fill-current" />
            )}
          </button>

          {/* Label / Status Display */}
          <div className="flex flex-col">
            {status === "recording" ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-ping" />
                <span className="text-xs font-mono text-[#f3f0df] font-medium tracking-wide">
                  Recording • {formatAudioDuration(duration)}
                </span>
              </div>
            ) : status === "transcribing" ? (
              <span className="text-xs font-sans text-[#62a57f]">
                Transcribing voice note...
              </span>
            ) : (
              <span className="text-xs font-sans text-[rgba(243,240,223,0.85)]">
                {label}
              </span>
            )}

            <span className="text-[10px] font-mono text-[rgba(243,240,223,0.45)]">
              {status === "recording"
                ? "Tap mic again to stop & finish"
                : "Powered by Sarvam saaras:v3"}
            </span>
          </div>
        </div>

        {/* Right Side: Cancel button if recording */}
        {status === "recording" && (
          <button
            type="button"
            onClick={cancelRecording}
            aria-label="Cancel recording"
            className="p-2 rounded-sm text-[rgba(243,240,223,0.6)] hover:text-[#f3f0df] hover:bg-[rgba(243,240,223,0.1)] transition-colors text-xs flex items-center gap-1 focus:outline-none"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline font-mono text-[11px]">Cancel</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="p-2.5 bg-[#261717] border border-[rgba(239,68,68,0.3)] rounded-sm flex items-start gap-2 text-xs text-[#fca5a5] animate-fade-in">
          <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[rgba(243,240,223,0.4)] hover:text-[#f3f0df]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
