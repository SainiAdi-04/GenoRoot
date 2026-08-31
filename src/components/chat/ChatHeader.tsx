"use client";

import React from "react";
import { Code2, RotateCcw } from "lucide-react";

interface ChatHeaderProps {
  onReset: () => void;
  onToggleDebug: () => void;
  isDebugOpen: boolean;
  phaseLabel?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onReset,
  onToggleDebug,
  isDebugOpen,
  phaseLabel = "PHASE 1 OF 4 • SECTION A",
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#16201b]/95 backdrop-blur-md border-b border-[rgba(243,240,223,0.15)] px-4 py-3 sm:px-6">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {/* Left: Doctor / Consultation Status */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#1f2e27] border border-[rgba(243,240,223,0.2)] flex items-center justify-center text-sm font-serif font-semibold text-[#f3f0df]">
              DS
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#4ade80] ring-2 ring-[#111814]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-medium text-[#f3f0df] truncate">
                Dr. Sharma
              </h1>
              <span className="hidden sm:inline-block text-[11px] font-mono tracking-wider px-1.5 py-0.5 rounded bg-[rgba(78,135,102,0.2)] border border-[rgba(78,135,102,0.4)] text-[#62a57f]">
                {phaseLabel}
              </span>
            </div>
            <p className="text-xs text-[rgba(243,240,223,0.6)] truncate flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
              Preparing your clinical consultation
            </p>
          </div>
        </div>

        {/* Right: Actions (Reset + JSON Inspector) */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            type="button"
            onClick={onToggleDebug}
            title="Inspect Schema JSON"
            className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded border transition-colors ${
              isDebugOpen
                ? "bg-[#4e8766] text-white border-[#4e8766]"
                : "bg-[#18241e] text-[rgba(243,240,223,0.8)] border-[rgba(243,240,223,0.18)] hover:bg-[#1f2e27] hover:text-[#f3f0df]"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">JSON</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm("Reset intake form and start fresh?")) {
                onReset();
              }
            }}
            title="Reset Intake"
            className="p-1.5 rounded border border-[rgba(243,240,223,0.15)] bg-[#18241e] text-[rgba(243,240,223,0.7)] hover:text-[#f3f0df] hover:bg-[#1f2e27] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
