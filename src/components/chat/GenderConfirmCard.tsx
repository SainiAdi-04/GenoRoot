"use client";

import React from "react";
import { Check, X, ShieldAlert } from "lucide-react";
import { GenderInference } from "@/types/schema";

interface GenderConfirmCardProps {
  genderInference?: GenderInference;
  onConfirm: (confirmed: boolean) => void;
}

export const GenderConfirmCard: React.FC<GenderConfirmCardProps> = ({
  genderInference,
  onConfirm,
}) => {
  const cue = genderInference?.cues || "your mention in the voice note";
  const gender = genderInference?.inferred_gender === "male" ? "male" : "female";

  return (
    <div className="my-3 bg-[#16201b] border border-[rgba(243,240,223,0.22)] p-5 sm:p-6 rounded-sm shadow-lg animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="w-4 h-4 text-[#62a57f]" />
        <span className="text-[11px] font-mono tracking-wider text-[#62a57f] uppercase">
          Clinical Personalization
        </span>
      </div>

      <h3 className="text-lg sm:text-xl font-serif text-[#f3f0df] tracking-tight mb-2">
        Tailor hormonal and health questions?
      </h3>

      <p className="text-xs sm:text-sm text-[rgba(243,240,223,0.85)] leading-relaxed mb-5">
        I noticed {cue} — I can tailor the upcoming hormonal and health questions accordingly. Sound right?
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => onConfirm(true)}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#4e8766] hover:bg-[#5ca37c] active:bg-[#3d7054] text-[#f3f0df] font-medium text-xs sm:text-sm rounded-sm transition-all shadow-md focus:outline-none"
        >
          <Check className="w-4 h-4 text-[#f3f0df]" />
          <span>Yes, tailor questions ({gender})</span>
        </button>

        <button
          type="button"
          onClick={() => onConfirm(false)}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#1b2721] hover:bg-[#24342c] text-[rgba(243,240,223,0.8)] hover:text-[#f3f0df] border border-[rgba(243,240,223,0.18)] font-medium text-xs sm:text-sm rounded-sm transition-all focus:outline-none"
        >
          <X className="w-4 h-4 text-[rgba(243,240,223,0.6)]" />
          <span>No, show all questions</span>
        </button>
      </div>
    </div>
  );
};
