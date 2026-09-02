"use client";

import React, { useState } from "react";
import { Check, Sparkles, Edit3, X, ArrowRight } from "lucide-react";
import { CascadeFieldItem } from "@/types/schema";

interface CascadeCardProps {
  fields: CascadeFieldItem[];
  onConfirmAll: () => void;
  onUpdateField: (fieldKey: string, newValue: unknown, newDisplayValue?: string) => void;
}

export const CascadeCard: React.FC<CascadeCardProps> = ({
  fields,
  onConfirmAll,
  onUpdateField,
}) => {
  const [editingField, setEditingField] = useState<CascadeFieldItem | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleStartEdit = (field: CascadeFieldItem) => {
    setEditingField(field);
    setEditValue(field.displayValue);
  };

  const handleSaveEdit = () => {
    if (!editingField) return;
    const trimmed = editValue.trim();
    if (trimmed) {
      if (editingField.key === "age_hair_loss_began") {
        const parsed = parseInt(trimmed, 10);
        if (!isNaN(parsed)) {
          onUpdateField(editingField.key, parsed, `${parsed} years old`);
        }
      } else if (
        editingField.key === "family_history" ||
        editingField.key === "pattern" ||
        editingField.key === "diagnosed_conditions" ||
        editingField.key === "past_6_months"
      ) {
        const arr = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
        onUpdateField(editingField.key, arr, arr.join(", "));
      } else if (editingField.key === "smoking") {
        const isTrue =
          trimmed.toLowerCase() !== "no" && trimmed.toLowerCase() !== "false";
        onUpdateField(editingField.key, isTrue, trimmed);
      } else if (
        editingField.key === "adult_acne_oily_skin" ||
        editingField.key === "excess_body_facial_hair"
      ) {
        const isTrue =
          trimmed.toLowerCase() !== "no" && trimmed.toLowerCase() !== "false";
        onUpdateField(editingField.key, isTrue, isTrue ? "Yes" : "No");
      } else {
        onUpdateField(editingField.key, trimmed, trimmed);
      }
    }
    setEditingField(null);
  };

  return (
    <div className="my-3 bg-[#16201b] border border-[rgba(243,240,223,0.22)] p-5 sm:p-6 rounded-sm shadow-lg animate-fade-in">
      {/* Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[rgba(78,135,102,0.2)] border border-[rgba(78,135,102,0.35)] rounded-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#62a57f]" />
          <span className="text-[11px] font-mono tracking-wider text-[#62a57f] uppercase">
            Voice Cascade • Auto-Detected
          </span>
        </div>
        <span className="text-[11px] font-mono text-[rgba(243,240,223,0.5)]">
          {fields.length} FIELDS DETECTED
        </span>
      </div>

      <h3 className="text-xl sm:text-2xl font-serif text-[#f3f0df] tracking-tight mb-2">
        🎉 {fields.length} details auto-filled from your voice note!
      </h3>
      <p className="text-xs sm:text-sm text-[rgba(243,240,223,0.7)] mb-5">
        Extracted directly from your Hinglish voice note. Tap any chip to edit, or confirm all in one tap:
      </p>

      {/* Extracted Chips Grid */}
      <div className="flex flex-wrap gap-2.5 mb-6">
        {fields.map((field) => (
          <button
            key={field.key}
            type="button"
            onClick={() => handleStartEdit(field)}
            className="group inline-flex items-center gap-2 px-3.5 py-2 bg-[#1b2721] hover:bg-[#22332a] active:bg-[#283e33] border border-[rgba(243,240,223,0.18)] hover:border-[#62a57f] text-[#f3f0df] text-xs sm:text-sm rounded-full transition-all text-left shadow-sm"
            title="Tap to edit this field"
          >
            <span className="text-[rgba(243,240,223,0.6)] group-hover:text-[rgba(243,240,223,0.8)]">
              {field.label}:
            </span>
            <span className="font-medium text-[#f3f0df]">
              {field.displayValue}
            </span>
            <span className="w-4 h-4 rounded-full bg-[rgba(78,135,102,0.25)] flex items-center justify-center text-[#62a57f]">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
          </button>
        ))}
      </div>

      {/* Action CTA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-[rgba(243,240,223,0.1)]">
        <button
          type="button"
          onClick={onConfirmAll}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#4e8766] hover:bg-[#5ca37c] active:bg-[#3d7054] text-[#f3f0df] font-medium text-sm rounded-sm transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[#62a57f] focus:ring-offset-2 focus:ring-offset-[#111814]"
        >
          <span>Confirm All ({fields.length} items)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Inline Edit Modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#16201b] border border-[rgba(243,240,223,0.25)] w-full max-w-md p-5 rounded-sm shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#62a57f]" />
                <h4 className="text-base font-serif text-[#f3f0df]">
                  Edit: {editingField.label}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="text-[rgba(243,240,223,0.5)] hover:text-[#f3f0df] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[rgba(243,240,223,0.6)] mb-3">
              Update the auto-filled value before confirming:
            </p>

            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full bg-[#111814] border border-[rgba(243,240,223,0.2)] focus:border-[#62a57f] px-3 py-2.5 text-sm text-[#f3f0df] rounded-sm outline-none mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") setEditingField(null);
              }}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="px-4 py-2 text-xs text-[rgba(243,240,223,0.7)] hover:text-[#f3f0df] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-[#4e8766] hover:bg-[#5ca37c] text-[#f3f0df] text-xs font-medium rounded-sm transition-colors"
              >
                Save Field
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
