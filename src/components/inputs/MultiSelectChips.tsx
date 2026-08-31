"use client";

import React, { useState } from "react";
import { QuestionConfig, QuestionOption } from "@/types/schema";
import { Check, ArrowRight } from "lucide-react";

interface MultiSelectChipsProps {
  question: QuestionConfig;
  onConfirm: (values: string[]) => void;
  defaultValues?: string[] | null;
}

export const MultiSelectChips: React.FC<MultiSelectChipsProps> = ({
  question,
  onConfirm,
  defaultValues,
}) => {
  const [selected, setSelected] = useState<string[]>(defaultValues || []);
  const [error, setError] = useState<string | null>(null);

  const options = question.options || [];

  const handleToggle = (opt: QuestionOption) => {
    if (error) setError(null);

    if (opt.isExclusive) {
      // If exclusive option is selected (e.g. "No known family history"), clear all others
      if (selected.includes(opt.value)) {
        setSelected([]);
      } else {
        setSelected([opt.value]);
      }
      return;
    }

    // Non-exclusive option: remove any exclusive option that might have been selected
    const withoutExclusive = selected.filter((v) => {
      const optionDef = options.find((o) => o.value === v);
      return !optionDef?.isExclusive;
    });

    if (withoutExclusive.includes(opt.value)) {
      setSelected(withoutExclusive.filter((v) => v !== opt.value));
    } else {
      setSelected([...withoutExclusive, opt.value]);
    }
  };

  const handleConfirm = () => {
    if (selected.length === 0) {
      setError("Please select at least one option to continue.");
      return;
    }
    setError(null);
    onConfirm(selected);
  };

  return (
    <div className="w-full bg-[#16201b] border border-[rgba(243,240,223,0.18)] p-4 sm:p-5 rounded-sm my-3 animate-fade-in shadow-md">
      {question.helperText && (
        <p className="text-xs text-[rgba(243,240,223,0.6)] mb-3 font-sans">
          {question.helperText}
        </p>
      )}

      {/* Pill Chips Grid */}
      <div className="flex flex-wrap gap-2.5 mb-4">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleToggle(opt)}
              className={`min-h-[44px] px-4 sm:px-5 py-2.5 rounded-full border text-sm font-medium transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#62a57f] ${
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

      {/* Confirm CTA button */}
      <div className="flex items-center justify-between pt-2 border-t border-[rgba(243,240,223,0.1)]">
        <span className="text-xs font-mono text-[rgba(243,240,223,0.5)]">
          {selected.length} {selected.length === 1 ? "option" : "options"} selected
        </span>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={selected.length === 0}
          className={`min-h-[44px] px-5 py-2.5 font-medium text-sm rounded-sm transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#62a57f] ${
            selected.length > 0
              ? "bg-[#4e8766] hover:bg-[#5ca37c] active:bg-[#3d7054] text-[#f3f0df] shadow-sm cursor-pointer"
              : "bg-[#18241e] text-[rgba(243,240,223,0.3)] border border-[rgba(243,240,223,0.1)] cursor-not-allowed"
          }`}
        >
          <span>Confirm Selection</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-[#ef4444] font-sans animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
};
