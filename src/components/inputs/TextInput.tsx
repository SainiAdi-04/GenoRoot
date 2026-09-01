"use client";

import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import { QuestionConfig, VoiceInputPayload } from "@/types/schema";
import { VoiceInputButton } from "./VoiceInputButton";

interface TextInputProps {
  question: QuestionConfig;
  onSubmit: (value: string) => void;
  defaultValue?: string | null;
  onVoiceSubmitted?: (payload: VoiceInputPayload) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
}

export const TextInput: React.FC<TextInputProps> = ({
  question,
  onSubmit,
  defaultValue,
  onVoiceSubmitted,
  onProcessingChange,
}) => {
  const [text, setText] = useState<string>(defaultValue || "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Please provide a brief description before continuing.");
      return;
    }
    setError(null);
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full bg-[#16201b] border border-[rgba(243,240,223,0.18)] p-4 sm:p-5 rounded-sm my-3 animate-fade-in shadow-md">
      {question.helperText && (
        <p className="text-xs text-[rgba(243,240,223,0.6)] mb-3 font-sans">
          {question.helperText}
        </p>
      )}

      {/* Voice Input (Sarvam STT) Option */}
      {onVoiceSubmitted && (
        <div className="mb-4">
          <VoiceInputButton
            questionId={question.id}
            onVoiceSubmitted={onVoiceSubmitted}
            onProcessingChange={onProcessingChange}
            label="Speak your response in Hinglish / English"
          />
          <div className="relative flex py-2.5 items-center">
            <div className="flex-grow border-t border-[rgba(243,240,223,0.1)]"></div>
            <span className="flex-shrink mx-3 text-[10px] font-mono text-[rgba(243,240,223,0.35)] uppercase tracking-wider">
              or type below
            </span>
            <div className="flex-grow border-t border-[rgba(243,240,223,0.1)]"></div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          rows={3}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={question.placeholder || "Type your response here..."}
          className="w-full p-3.5 bg-[#111814] border border-[rgba(243,240,223,0.2)] focus:border-[#62a57f] focus:ring-1 focus:ring-[#62a57f] text-[#f3f0df] font-sans text-sm rounded-sm outline-none transition-colors placeholder:text-[rgba(243,240,223,0.3)] resize-none"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-mono text-[rgba(243,240,223,0.4)]">
            Press ⌘+Enter to submit
          </span>

          <button
            type="submit"
            disabled={!text.trim()}
            className={`min-h-[44px] px-5 py-2.5 font-medium text-sm rounded-sm transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#62a57f] ${
              text.trim()
                ? "bg-[#4e8766] hover:bg-[#5ca37c] active:bg-[#3d7054] text-[#f3f0df] shadow-sm cursor-pointer"
                : "bg-[#18241e] text-[rgba(243,240,223,0.3)] border border-[rgba(243,240,223,0.1)] cursor-not-allowed"
            }`}
          >
            <span>Submit</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-2 text-xs text-[#ef4444] font-sans animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
};
