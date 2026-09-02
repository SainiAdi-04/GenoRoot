"use client";

import React, { useEffect } from "react";
import { Check, RotateCcw, Volume2 } from "lucide-react";
import { tts } from "@/lib/ttsService";

interface VoiceConfirmationCardProps {
  confirmationPhrase: string;
  displayBadges: string[];
  rawTranscript: string;
  onConfirm: () => void;
  onReject: () => void;
}

export const VoiceConfirmationCard: React.FC<VoiceConfirmationCardProps> = ({
  confirmationPhrase,
  displayBadges,
  rawTranscript,
  onConfirm,
  onReject,
}) => {
  // Read confirmation aloud on mount
  useEffect(() => {
    tts.speak(confirmationPhrase);
    return () => {
      tts.stop();
    };
  }, [confirmationPhrase]);

  return (
    <div className="w-full bg-[#1b2721] border-2 border-[#62a57f] p-5 sm:p-6 rounded-sm my-4 shadow-xl animate-fade-in">
      {/* Header with audio wave indicator */}
      <div className="flex items-center justify-between pb-3 border-b border-[rgba(243,240,223,0.15)] mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-[#62a57f] animate-pulse" />
          <span className="text-xs font-mono tracking-wider uppercase text-[#62a57f] font-semibold">
            Voice Confirmation
          </span>
        </div>
        <button
          type="button"
          onClick={() => tts.speak(confirmationPhrase)}
          aria-label="Replay confirmation voice"
          className="p-1.5 rounded-sm hover:bg-[rgba(243,240,223,0.1)] text-[#62a57f] hover:text-[#f3f0df] transition-colors flex items-center gap-1.5 text-xs font-mono"
        >
          <Volume2 className="w-4 h-4" />
          <span>Replay</span>
        </button>
      </div>

      {/* Spoken Transcript preview */}
      <div className="mb-4">
        <p className="text-[11px] font-mono text-[rgba(243,240,223,0.5)] mb-1">
          What you said:
        </p>
        <p className="text-xs font-sans italic text-[rgba(243,240,223,0.85)] bg-[#141d18] px-3.5 py-2.5 rounded border border-[rgba(243,240,223,0.1)]">
          &ldquo;{rawTranscript}&rdquo;
        </p>
      </div>

      {/* Extracted Badges */}
      <div className="mb-5">
        <p className="text-xs font-sans text-[rgba(243,240,223,0.7)] mb-2 font-medium">
          Captured for Dr. Sharma:
        </p>
        <div className="flex flex-wrap gap-2">
          {displayBadges.map((badge, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-[#1f3328] border border-[#62a57f] text-[#f3f0df] text-sm font-medium shadow-sm"
            >
              <Check className="w-4 h-4 text-[#62a57f]" />
              <span>{badge}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Confirmation prompt */}
      <p className="text-sm font-sans font-medium text-[#f3f0df] mb-5 leading-snug">
        {confirmationPhrase}
      </p>

      {/* Massive 55-year-old friendly action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => {
            tts.stop();
            onConfirm();
          }}
          className="flex-1 min-h-[52px] px-6 py-3.5 bg-[#4e8766] hover:bg-[#5ca37c] active:bg-[#3d7054] text-[#f3f0df] text-base font-semibold rounded-sm transition-all shadow-md flex items-center justify-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-[#62a57f]"
        >
          <Check className="w-5 h-5" />
          <span>Yes, that&apos;s right</span>
        </button>

        <button
          type="button"
          onClick={() => {
            tts.stop();
            onReject();
          }}
          className="sm:w-auto px-5 py-3.5 min-h-[52px] bg-[#141d18] border border-[rgba(243,240,223,0.25)] hover:bg-[#1e2a23] text-[rgba(243,240,223,0.85)] hover:text-[#f3f0df] text-sm font-medium rounded-sm transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Try again</span>
        </button>
      </div>

      <p className="text-[11px] font-mono text-[rgba(243,240,223,0.45)] text-center mt-3">
        Tap button above or say &ldquo;Yes&rdquo; to confirm.
      </p>
    </div>
  );
};
