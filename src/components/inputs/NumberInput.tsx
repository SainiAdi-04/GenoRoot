"use client";

import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import { QuestionConfig } from "@/types/schema";

interface NumberInputProps {
  question: QuestionConfig;
  onSubmit: (value: number) => void;
  defaultValue?: number | null;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  question,
  onSubmit,
  defaultValue,
}) => {
  const [val, setVal] = useState<string>(
    defaultValue !== undefined && defaultValue !== null ? String(defaultValue) : ""
  );
  const [error, setError] = useState<string | null>(null);

  const quickAges = [18, 21, 24, 28, 32, 38, 45];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      setError("Please enter a valid age (e.g. 24).");
      return;
    }
    const min = question.min ?? 10;
    const max = question.max ?? 99;
    if (num < min || num > max) {
      setError(`Please enter an age between ${min} and ${max}.`);
      return;
    }

    setError(null);
    onSubmit(num);
  };

  const handleQuickSelect = (age: number) => {
    setVal(String(age));
    setError(null);
    onSubmit(age);
  };

  return (
    <div className="w-full bg-[#16201b] border border-[rgba(243,240,223,0.18)] p-4 sm:p-5 rounded-sm my-3 animate-fade-in shadow-md">
      {question.helperText && (
        <p className="text-xs text-[rgba(243,240,223,0.6)] mb-3 font-sans">
          {question.helperText}
        </p>
      )}

      {/* Quick Suggestions */}
      <div className="mb-4">
        <span className="text-[11px] font-mono text-[rgba(243,240,223,0.5)] block mb-1.5 uppercase">
          Quick select:
        </span>
        <div className="flex flex-wrap gap-2">
          {quickAges.map((age) => (
            <button
              key={age}
              type="button"
              onClick={() => handleQuickSelect(age)}
              className="min-h-[44px] px-3.5 py-2 rounded-full border border-[rgba(243,240,223,0.18)] bg-[#18241e] hover:border-[#62a57f] hover:bg-[#1f2e27] text-sm font-mono text-[#f3f0df] transition-colors focus:outline-none focus:ring-1 focus:ring-[#62a57f]"
            >
              {age} yrs
            </button>
          ))}
        </div>
      </div>

      {/* Manual Input Form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <input
            type="number"
            min={question.min ?? 10}
            max={question.max ?? 99}
            value={val}
            onChange={(e) => {
              setVal(e.target.value);
              if (error) setError(null);
            }}
            placeholder={question.placeholder || "Enter age in years"}
            className="w-full min-h-[48px] px-4 py-3 bg-[#111814] border border-[rgba(243,240,223,0.2)] focus:border-[#62a57f] focus:ring-1 focus:ring-[#62a57f] text-[#f3f0df] font-mono text-base rounded-sm outline-none transition-colors placeholder:text-[rgba(243,240,223,0.3)]"
          />
          {question.unit && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[rgba(243,240,223,0.4)] pointer-events-none">
              {question.unit}
            </span>
          )}
        </div>

        <button
          type="submit"
          className="min-h-[48px] px-6 py-3 bg-[#4e8766] hover:bg-[#5ca37c] active:bg-[#3d7054] text-[#f3f0df] font-medium text-sm rounded-sm transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#62a57f]"
        >
          <span>Submit</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {error && (
        <p className="mt-2 text-xs text-[#ef4444] font-sans animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
};
