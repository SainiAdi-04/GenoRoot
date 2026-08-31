"use client";

import React, { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { QuestionConfig } from "@/types/schema";

interface CombinedYesNoInputProps {
  question: QuestionConfig;
  onConfirm: (values: {
    adult_acne_oily_skin: boolean;
    excess_body_facial_hair: boolean;
  }) => void;
  defaultValue?: {
    adult_acne_oily_skin?: boolean | null;
    excess_body_facial_hair?: boolean | null;
  } | null;
}

export const CombinedYesNoInput: React.FC<CombinedYesNoInputProps> = ({
  question,
  onConfirm,
  defaultValue,
}) => {
  const [acne, setAcne] = useState<boolean>(defaultValue?.adult_acne_oily_skin ?? false);
  const [excessHair, setExcessHair] = useState<boolean>(defaultValue?.excess_body_facial_hair ?? false);

  const handleConfirm = () => {
    onConfirm({
      adult_acne_oily_skin: acne,
      excess_body_facial_hair: excessHair,
    });
  };

  return (
    <div className="w-full bg-[#16201b] border border-[rgba(243,240,223,0.18)] p-4 sm:p-5 rounded-sm my-3 animate-fade-in shadow-md">
      {question.helperText && (
        <p className="text-xs text-[rgba(243,240,223,0.6)] mb-4 font-sans">
          {question.helperText}
        </p>
      )}

      <div className="space-y-4 mb-5">
        {/* Item 1: Adult Acne / Oily Skin */}
        <div className="p-3.5 bg-[#121a15] border border-[rgba(243,240,223,0.1)] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-sm font-medium text-[#f3f0df] block">
              Adult acne or persistent oily skin?
            </span>
            <span className="text-xs text-[rgba(243,240,223,0.5)]">
              Sebum &amp; androgenic sensitivity marker
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAcne(false)}
              className={`min-h-[44px] min-w-[70px] px-4 py-2 rounded-full border text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 ${
                !acne
                  ? "bg-[#4e8766] text-[#f3f0df] border-[#62a57f] shadow-sm"
                  : "bg-[#18241e] text-[rgba(243,240,223,0.8)] border-[rgba(243,240,223,0.2)] hover:border-[#62a57f]"
              }`}
            >
              {!acne && <Check className="w-3.5 h-3.5" />}
              <span>No</span>
            </button>

            <button
              type="button"
              onClick={() => setAcne(true)}
              className={`min-h-[44px] min-w-[70px] px-4 py-2 rounded-full border text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 ${
                acne
                  ? "bg-[#4e8766] text-[#f3f0df] border-[#62a57f] shadow-sm"
                  : "bg-[#18241e] text-[rgba(243,240,223,0.8)] border-[rgba(243,240,223,0.2)] hover:border-[#62a57f]"
              }`}
            >
              {acne && <Check className="w-3.5 h-3.5" />}
              <span>Yes</span>
            </button>
          </div>
        </div>

        {/* Item 2: Excess Body or Facial Hair */}
        <div className="p-3.5 bg-[#121a15] border border-[rgba(243,240,223,0.1)] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-sm font-medium text-[#f3f0df] block">
              Excess body or facial hair (hirsutism)?
            </span>
            <span className="text-xs text-[rgba(243,240,223,0.5)]">
              Peripheral androgen conversion marker
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setExcessHair(false)}
              className={`min-h-[44px] min-w-[70px] px-4 py-2 rounded-full border text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 ${
                !excessHair
                  ? "bg-[#4e8766] text-[#f3f0df] border-[#62a57f] shadow-sm"
                  : "bg-[#18241e] text-[rgba(243,240,223,0.8)] border-[rgba(243,240,223,0.2)] hover:border-[#62a57f]"
              }`}
            >
              {!excessHair && <Check className="w-3.5 h-3.5" />}
              <span>No</span>
            </button>

            <button
              type="button"
              onClick={() => setExcessHair(true)}
              className={`min-h-[44px] min-w-[70px] px-4 py-2 rounded-full border text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 ${
                excessHair
                  ? "bg-[#4e8766] text-[#f3f0df] border-[#62a57f] shadow-sm"
                  : "bg-[#18241e] text-[rgba(243,240,223,0.8)] border-[rgba(243,240,223,0.2)] hover:border-[#62a57f]"
              }`}
            >
              {excessHair && <Check className="w-3.5 h-3.5" />}
              <span>Yes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <div className="flex justify-end pt-2 border-t border-[rgba(243,240,223,0.1)]">
        <button
          type="button"
          onClick={handleConfirm}
          className="min-h-[44px] px-6 py-2.5 bg-[#4e8766] hover:bg-[#5ca37c] active:bg-[#3d7054] text-[#f3f0df] font-medium text-sm rounded-sm transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#62a57f]"
        >
          <span>Confirm Answers</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
