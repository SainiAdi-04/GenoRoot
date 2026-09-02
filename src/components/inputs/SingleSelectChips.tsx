"use client";

import React, { useState } from "react";
import { QuestionConfig, QuestionOption, VoiceInputPayload } from "@/types/schema";
import { Check } from "lucide-react";
import { VoiceInputButton } from "./VoiceInputButton";
import { tts } from "@/lib/ttsService";

interface SingleSelectChipsProps {
  question: QuestionConfig;
  onSelect: (value: string) => void;
  defaultValue?: string | null;
  onVoiceSubmitted?: (payload: VoiceInputPayload) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
}

export const SingleSelectChips: React.FC<SingleSelectChipsProps> = ({
  question,
  onSelect,
  defaultValue,
  onVoiceSubmitted,
  onProcessingChange,
}) => {
  const [selected, setSelected] = useState<string | null>(defaultValue || null);

  const handleOptionClick = (option: QuestionOption) => {
    tts.stop();
    setSelected(option.value);
    onSelect(option.value);
  };

  const options = question.options || [];
  const hasDescriptions = options.some((opt) => opt.description);

  return (
    <div className="w-full bg-[#16201b] border border-[rgba(243,240,223,0.18)] p-4 sm:p-5 rounded-sm my-3 animate-fade-in shadow-md">
      {question.helperText && (
        <p className="text-xs text-[rgba(243,240,223,0.6)] mb-3.5 font-sans">
          {question.helperText}
        </p>
      )}

      {/* Voice-First Input Option (Speak or Tap) */}
      {onVoiceSubmitted && (
        <div className="mb-4 pb-3 border-b border-[rgba(243,240,223,0.1)]">
          <VoiceInputButton
            questionId={question.id}
            onVoiceSubmitted={onVoiceSubmitted}
            onProcessingChange={onProcessingChange}
            label="Or speak your answer (Voice-first)"
          />
        </div>
      )}

      {hasDescriptions ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleOptionClick(opt)}
                className={`p-4 min-h-[56px] rounded-sm border text-left transition-all flex items-start justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-[#62a57f] ${
                  isSelected
                    ? "bg-[#1f3328] text-[#f3f0df] border-[#62a57f] shadow-sm"
                    : "bg-[#141d18] text-[rgba(243,240,223,0.9)] border-[rgba(243,240,223,0.2)] hover:border-[#62a57f] hover:bg-[#18241e]"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm sm:text-base font-medium text-[#f3f0df]">
                      {opt.label}
                    </span>
                  </div>
                  {opt.description && (
                    <p className="text-xs text-[rgba(243,240,223,0.6)] leading-snug">
                      {opt.description}
                    </p>
                  )}
                </div>
                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected
                      ? "bg-[#4e8766] border-[#62a57f] text-[#f3f0df]"
                      : "border-[rgba(243,240,223,0.3)] bg-[#111814]"
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleOptionClick(opt)}
                className={`min-h-[52px] px-5 py-3 rounded-sm border text-sm sm:text-base font-medium transition-all flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-[#62a57f] ${
                  isSelected
                    ? "bg-[#4e8766] text-[#f3f0df] border-[#62a57f] shadow-sm"
                    : "bg-[#18241e] text-[rgba(243,240,223,0.9)] border-[rgba(243,240,223,0.25)] hover:border-[#62a57f] hover:bg-[#1f2e27] hover:text-[#f3f0df]"
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-4 h-4 text-[#f3f0df]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
