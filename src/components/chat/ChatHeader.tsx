"use client";

import React from "react";
import { Code2, RotateCcw, Volume2, VolumeX } from "lucide-react";

interface ChatHeaderProps {
  onReset: () => void;
  onToggleDebug: () => void;
  isDebugOpen: boolean;
  phaseLabel?: string;
  isTtsEnabled?: boolean;
  onToggleTts?: () => void;
  speaker?: string;
  onChangeSpeaker?: (speaker: string) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onReset,
  onToggleDebug,
  isDebugOpen,
  phaseLabel = "CLINICAL INTAKE",
  isTtsEnabled = true,
  onToggleTts,
  speaker = "shubh",
  onChangeSpeaker,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#16201b]/95 backdrop-blur-md border-b border-[rgba(243,240,223,0.15)] px-3 sm:px-6 py-2.5 sm:py-3">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Doctor / Consultation Status */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1f2e27] border border-[rgba(78,135,102,0.4)] flex items-center justify-center text-xs sm:text-sm font-serif font-semibold text-[#f3f0df] shadow-sm">
              DS
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#4ade80] ring-2 ring-[#16201b]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-sm font-medium text-[#f3f0df] truncate">
                Dr. Sharma
              </h1>
              <span className="hidden md:inline-block text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded bg-[rgba(78,135,102,0.2)] border border-[rgba(78,135,102,0.4)] text-[#62a57f]">
                {phaseLabel}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-[rgba(243,240,223,0.6)] truncate flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse shrink-0" />
              <span className="truncate">Hair Clinic Check-in</span>
            </p>
          </div>
        </div>

        {/* Right: Actions (TTS + Reset + JSON Inspector) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onToggleTts && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleTts}
                title={isTtsEnabled ? "Mute automatic voice narration" : "Enable automatic voice narration"}
                className={`inline-flex items-center gap-1.5 text-xs font-mono p-1.5 sm:px-2.5 sm:py-1.5 rounded border transition-colors cursor-pointer shrink-0 ${
                  isTtsEnabled
                    ? "bg-[#1f3328] text-[#a7f3d0] border-[#62a57f]"
                    : "bg-[#18241e] text-[rgba(243,240,223,0.5)] border-[rgba(243,240,223,0.15)] hover:text-[#f3f0df]"
                }`}
              >
                {isTtsEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#4ade80]" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isTtsEnabled ? "Voice ON" : "Voice Muted"}</span>
              </button>

              {isTtsEnabled && onChangeSpeaker && (
                <select
                  value={speaker}
                  onChange={(e) => onChangeSpeaker(e.target.value)}
                  className="hidden sm:inline-block bg-[#18241e] text-[#f3f0df] text-xs font-mono px-2 py-1.5 rounded border border-[rgba(243,240,223,0.18)] focus:outline-none focus:border-[#62a57f] cursor-pointer max-w-[170px] truncate"
                  title="Select Sarvam AI Voice (Bulbul v3)"
                >
                  <option value="shubh">Shubh (Hinglish Male)</option>
                  <option value="ishita">Ishita (Indian English Female ★)</option>
                  <option value="priya">Priya (Hinglish Female ★)</option>
                  <option value="ratan">Ratan (Indian English Male)</option>
                </select>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onToggleDebug}
            title="Inspect Schema JSON"
            className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded border transition-colors cursor-pointer shrink-0 ${
              isDebugOpen
                ? "bg-[#4e8766] text-white border-[#4e8766]"
                : "bg-[#18241e] text-[rgba(243,240,223,0.8)] border-[rgba(243,240,223,0.18)] hover:bg-[#1f2e27] hover:text-[#f3f0df]"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm("Reset intake form and start fresh?")) {
                onReset();
              }
            }}
            title="Reset Intake"
            className="p-1.5 rounded border border-[rgba(243,240,223,0.15)] bg-[#18241e] text-[rgba(243,240,223,0.7)] hover:text-[#f3f0df] hover:bg-[#1f2e27] transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
