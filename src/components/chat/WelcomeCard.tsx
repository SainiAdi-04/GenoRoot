"use client";

import React from "react";
import { Mic, ArrowRight, ShieldCheck } from "lucide-react";

interface WelcomeCardProps {
  onStartStepByStep: () => void;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({
  onStartStepByStep,
}) => {
  return (
    <div className="my-3 bg-[#16201b] border border-[rgba(243,240,223,0.18)] p-5 sm:p-6 rounded-sm shadow-md animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block px-2 py-0.5 text-[11px] font-mono tracking-wider text-[#62a57f] bg-[rgba(78,135,102,0.15)] border border-[rgba(78,135,102,0.3)] rounded-sm">
          CLINICAL INTAKE • SECTION A
        </span>
      </div>

      <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-[#f3f0df] tracking-tight leading-snug mb-3">
        Tell your hair story in your own words
      </h2>

      <p className="text-sm sm:text-base text-[rgba(243,240,223,0.85)] leading-relaxed mb-6 font-sans">
        Hi! 👋 I&apos;m here to help your doctor prepare for your consultation.
        You can speak naturally in Hindi, English, or Hinglish — or we can go
        through your intake step by step.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {/* Voice Note CTA (Placeholder for Phase 2) */}
        <button
          type="button"
          disabled
          className="relative group flex items-center justify-center gap-2 px-5 py-3.5 bg-[#18241e] border border-[rgba(243,240,223,0.12)] text-[rgba(243,240,223,0.4)] rounded-sm cursor-not-allowed text-sm font-medium transition-all"
        >
          <Mic className="w-4 h-4 opacity-50" />
          <span>🎙️ Record voice note</span>
          <span className="absolute -top-2.5 right-2 px-1.5 py-0.2 text-[9px] font-mono tracking-wider bg-[#111814] text-[rgba(243,240,223,0.6)] border border-[rgba(243,240,223,0.15)] rounded">
            PHASE 2 (SARVAM)
          </span>
        </button>

        {/* Step-by-Step CTA */}
        <button
          type="button"
          onClick={onStartStepByStep}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#4e8766] hover:bg-[#5ca37c] active:bg-[#3d7054] text-[#f3f0df] font-medium text-sm rounded-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#62a57f] focus:ring-offset-2 focus:ring-offset-[#111814]"
        >
          <span>Let&apos;s go step by step</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-5 pt-4 border-t border-[rgba(243,240,223,0.08)] flex items-center gap-2 text-xs text-[rgba(243,240,223,0.5)]">
        <ShieldCheck className="w-3.5 h-3.5 text-[#62a57f] flex-shrink-0" />
        <span>Takes ~2 minutes • Answers are private &amp; shared only with your treating doctor</span>
      </div>
    </div>
  );
};
