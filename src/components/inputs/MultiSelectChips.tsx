"use client";

import React, { useState } from "react";
import { QuestionConfig, QuestionOption, VoiceInputPayload } from "@/types/schema";
import { Check, ArrowRight, Sparkles, Search } from "lucide-react";
import { resolveBrandToProductCategory, resolveBrandMentions, ProductCategory } from "@/lib/brandResolver";
import { VoiceInputButton } from "./VoiceInputButton";
import { tts } from "@/lib/ttsService";

interface MultiSelectChipsProps {
  question: QuestionConfig;
  onConfirm: (values: string[]) => void;
  defaultValues?: string[] | null;
  onVoiceSubmitted?: (payload: VoiceInputPayload) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
}

export const MultiSelectChips: React.FC<MultiSelectChipsProps> = ({
  question,
  onConfirm,
  defaultValues,
  onVoiceSubmitted,
  onProcessingChange,
}) => {
  const [selected, setSelected] = useState<string[]>(defaultValues || []);
  const [error, setError] = useState<string | null>(null);
  const [brandInput, setBrandInput] = useState<string>("");
  const [brandFeedback, setBrandFeedback] = useState<{
    query: string;
    categories: ProductCategory[];
  } | null>(null);
  const [highlightedCategories, setHighlightedCategories] = useState<string[]>([]);

  const options = question.options || [];
  const isQ12Products = question.id === "q12_products_select" || question.key === "products";

  const handleToggle = (opt: QuestionOption) => {
    tts.stop();
    if (error) setError(null);

    if (opt.isExclusive) {
      if (selected.includes(opt.value)) {
        setSelected([]);
      } else {
        setSelected([opt.value]);
      }
      return;
    }

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

  const resolveAndHighlightBrands = (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    let matched = resolveBrandMentions(trimmed);
    if (matched.length === 0) {
      const single = resolveBrandToProductCategory(trimmed);
      if (single) matched = [single];
    }

    if (matched.length > 0) {
      setSelected((prev) => {
        const withoutExclusive = prev.filter((v) => {
          const optDef = options.find((o) => o.value === v);
          return !optDef?.isExclusive;
        });
        const combined = new Set([...withoutExclusive, ...matched]);
        return Array.from(combined);
      });

      setHighlightedCategories((prev) => {
        const combined = new Set([...prev, ...matched]);
        return Array.from(combined);
      });

      setBrandFeedback({ query: trimmed, categories: matched });
      setError(null);
      setBrandInput("");
    } else {
      setError(`No pharmacy mapping found for "${trimmed}". Select from the categories below or tap 'None'.`);
    }
  };

  const handleVoiceBrandSubmit = (payload: VoiceInputPayload) => {
    const spoken = `${payload.translate} ${payload.codemix}`.trim();
    if (!spoken) return;
    resolveAndHighlightBrands(spoken);
  };

  const handleConfirm = () => {
    tts.stop();
    if (selected.length === 0) {
      setError("Please select at least one option to continue.");
      return;
    }
    setError(null);
    onConfirm(selected);
  };

  const hasDescriptions = options.some((opt) => opt.description);

  return (
    <div className="w-full bg-[#16201b] border border-[rgba(243,240,223,0.18)] p-4 sm:p-5 rounded-sm my-3 animate-fade-in shadow-md">
      {question.helperText && (
        <p className="text-xs text-[rgba(243,240,223,0.6)] mb-3 font-sans">
          {question.helperText}
        </p>
      )}

      {/* Voice-First Input Button */}
      {onVoiceSubmitted && !isQ12Products && (
        <div className="mb-4 pb-3 border-b border-[rgba(243,240,223,0.1)]">
          <VoiceInputButton
            questionId={question.id}
            onVoiceSubmitted={onVoiceSubmitted}
            onProcessingChange={onProcessingChange}
            label="Speak your answers (Voice-first)"
          />
        </div>
      )}

      {/* Brand Resolver Bar for Q12 */}
      {isQ12Products && (
        <div className="mb-4 p-3.5 bg-[#111914] border border-[#62a57f]/30 rounded-sm">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#a7f3d0]">
              <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
              <span className="font-semibold uppercase tracking-wider">Indian Brand Resolver</span>
            </div>
            <span className="text-[11px] font-mono text-[rgba(243,240,223,0.5)]">
              Auto-maps brands to categories
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
            {/* Column 1: Text search & Resolve CTA */}
            <div className="flex items-stretch gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[rgba(243,240,223,0.4)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={brandInput}
                  onChange={(e) => {
                    setBrandInput(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      resolveAndHighlightBrands(brandInput);
                    }
                  }}
                  placeholder="Type Indian brand (e.g. Tugain, Follihair, Scalpe-Pro, Finax)…"
                  className="w-full h-full min-h-[50px] pl-9 pr-3 py-2.5 bg-[#17231c] border border-[rgba(243,240,223,0.2)] rounded-sm text-xs font-sans text-[#f3f0df] placeholder-[rgba(243,240,223,0.35)] focus:outline-none focus:border-[#62a57f] transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={() => resolveAndHighlightBrands(brandInput)}
                className="min-h-[50px] px-4 py-2.5 bg-[#25392e] hover:bg-[#324f3f] active:bg-[#1f2e27] text-[#a7f3d0] border border-[#62a57f]/40 rounded-sm text-xs font-mono transition-colors font-medium shrink-0 flex items-center justify-center cursor-pointer"
              >
                Resolve
              </button>
            </div>

            {/* Column 2: Voice input mic for brand speech */}
            <div className="w-full">
              <VoiceInputButton
                questionId={question.id}
                onVoiceSubmitted={onVoiceSubmitted || handleVoiceBrandSubmit}
                onProcessingChange={onProcessingChange}
                label="Speak brands"
              />
            </div>
          </div>

          {/* Auto-mapping notification badge */}
          {brandFeedback && (
            <div className="mt-2.5 px-3 py-2 bg-[rgba(78,135,102,0.2)] border border-[#62a57f] rounded-sm flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#86efac] animate-fade-in">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                <span>
                  Mapped <strong>&quot;{brandFeedback.query}&quot;</strong> → <strong>{brandFeedback.categories.join(", ")}</strong>
                </span>
              </span>
              <span className="text-[10px] text-[rgba(243,240,223,0.5)]">auto-selected ✓</span>
            </div>
          )}
        </div>
      )}

      {/* Option Cards Grid (Senior-Friendly Touch Targets with Responsive Layout) */}
      {hasDescriptions ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            const isHighlighted = highlightedCategories.includes(opt.value);
            const isExclusive = opt.isExclusive;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleToggle(opt)}
                className={`p-4 min-h-[60px] rounded-sm border text-left transition-all flex items-start justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-[#62a57f] cursor-pointer ${
                  isExclusive ? "sm:col-span-2" : ""
                } ${
                  isHighlighted
                    ? "ring-2 ring-[#4ade80] bg-[#355f47] border-[#4ade80] text-[#f3f0df] shadow-md"
                    : isSelected
                    ? "bg-[#1f3328] text-[#f3f0df] border-[#62a57f] shadow-sm ring-1 ring-[#62a57f]"
                    : "bg-[#141d18] text-[rgba(243,240,223,0.9)] border-[rgba(243,240,223,0.2)] hover:border-[#62a57f] hover:bg-[#18241e]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm sm:text-base font-medium text-[#f3f0df] leading-snug">
                      {opt.label}
                    </span>
                  </div>
                  {opt.description && (
                    <p className="text-xs text-[rgba(243,240,223,0.6)] leading-relaxed">
                      {opt.description}
                    </p>
                  )}
                </div>
                <div
                  className={`w-5 h-5 rounded-sm border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected
                      ? "bg-[#4e8766] border-[#62a57f] text-[#f3f0df]"
                      : "border-[rgba(243,240,223,0.3)] bg-[#111814]"
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            const isHighlighted = highlightedCategories.includes(opt.value);
            const isExclusive = opt.isExclusive;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleToggle(opt)}
                className={`min-h-[52px] h-auto px-4 sm:px-5 py-3 rounded-sm border text-sm sm:text-base font-medium transition-all flex items-start justify-between gap-3 text-left focus:outline-none focus:ring-2 focus:ring-[#62a57f] cursor-pointer ${
                  isExclusive ? "sm:col-span-2" : ""
                } ${
                  isHighlighted
                    ? "ring-2 ring-[#4ade80] bg-[#355f47] border-[#4ade80] text-[#f3f0df] shadow-md"
                    : isSelected
                    ? "bg-[#1f3328] text-[#f3f0df] border-[#62a57f] shadow-sm ring-1 ring-[#62a57f]"
                    : "bg-[#18241e] text-[rgba(243,240,223,0.9)] border-[rgba(243,240,223,0.25)] hover:border-[#62a57f] hover:bg-[#1f2e27] hover:text-[#f3f0df]"
                }`}
              >
                <div className="flex-1 min-w-0 pr-1 text-left">
                  <span className="break-words whitespace-normal leading-snug block text-[#f3f0df]">
                    {opt.label}
                  </span>
                </div>
                <div
                  className={`w-5 h-5 rounded-sm border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected
                      ? "bg-[#4e8766] border-[#62a57f] text-[#f3f0df]"
                      : "border-[rgba(243,240,223,0.3)] bg-[#111814]"
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Confirm CTA button */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-[rgba(243,240,223,0.1)]">
        <span className="text-xs font-mono text-[rgba(243,240,223,0.5)]">
          {selected.length} {selected.length === 1 ? "option" : "options"} selected
        </span>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={selected.length === 0}
          className={`min-h-[50px] px-5 sm:px-6 py-2.5 sm:py-3 font-medium text-sm sm:text-base rounded-sm transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#62a57f] ${
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
