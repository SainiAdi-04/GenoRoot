"use client";

import React, { useState } from "react";
import { QuestionConfig, QuestionOption } from "@/types/schema";
import { Check } from "lucide-react";

interface SingleSelectChipsProps {
  question: QuestionConfig;
  onSelect: (value: string) => void;
  defaultValue?: string | null;
}

export const SingleSelectChips: React.FC<SingleSelectChipsProps> = ({
  question,
  onSelect,
  defaultValue,
}) => {
  const [selected, setSelected] = useState<string | null>(defaultValue || null);

  const handleOptionClick = (option: QuestionOption) => {
    setSelected(option.value);
    // Instant submission for smooth conversational flow
    onSelect(option.value);
  };

  const options = question.options || [];

  return (
    <div className="w-full bg-[#16201b] border border-[rgba(243,240,223,0.18)] p-4 sm:p-5 rounded-sm my-3 animate-fade-in shadow-md">
      {question.helperText && (
        <p className="text-xs text-[rgba(243,240,223,0.6)] mb-3 font-sans">
          {question.helperText}
        </p>
      )}

      <div className="flex flex-wrap gap-2.5">
        {options.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleOptionClick(opt)}
              className={`min-h-[44px] px-5 py-2.5 rounded-full border text-sm font-medium transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#62a57f] ${
                isSelected
                  ? "bg-[#4e8766] text-[#f3f0df] border-[#62a57f] shadow-sm"
                  : "bg-[#18241e] text-[rgba(243,240,223,0.9)] border-[rgba(243,240,223,0.2)] hover:border-[#62a57f] hover:bg-[#1f2e27] hover:text-[#f3f0df]"
              }`}
            >
              {opt.emoji && <span className="text-base">{opt.emoji}</span>}
              <span>{opt.label}</span>
              {isSelected && <Check className="w-4 h-4 text-[#f3f0df]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
