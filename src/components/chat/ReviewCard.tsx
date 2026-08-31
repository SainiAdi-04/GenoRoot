"use client";

import React from "react";
import { IntakeFormData } from "@/types/schema";
import { CheckCheck, Edit3, ArrowRight } from "lucide-react";

interface ReviewCardProps {
  formData: IntakeFormData;
  onEditField?: (questionId: string) => void;
  onContinue?: () => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  formData,
  onEditField,
  onContinue,
}) => {
  const summaryItems = [
    {
      id: "q1",
      label: "Age hair loss began",
      value: formData.age_hair_loss_began
        ? `${formData.age_hair_loss_began} years old`
        : "Not provided",
    },
    {
      id: "q2",
      label: "Current duration",
      value: formData.duration || "Not provided",
    },
    {
      id: "q3",
      label: "Family history",
      value:
        formData.family_history && formData.family_history.length > 0
          ? formData.family_history.join(", ")
          : "Not provided",
    },
    {
      id: "q4",
      label: "Noticed pattern",
      value:
        formData.pattern && formData.pattern.length > 0
          ? formData.pattern.join(", ")
          : "Not provided",
    },
  ];

  return (
    <div className="w-full my-4 bg-[#16201b] border border-[rgba(78,135,102,0.4)] p-5 sm:p-6 rounded-sm shadow-lg animate-fade-in">
      <div className="flex items-center justify-between pb-3 border-b border-[rgba(243,240,223,0.12)]">
        <div>
          <span className="text-[10px] font-mono tracking-wider uppercase text-[#62a57f] block">
            Clinical Summary
          </span>
          <h3 className="text-lg font-serif text-[#f3f0df]">
            Section A • Personal &amp; Family History
          </h3>
        </div>
        <div className="w-7 h-7 rounded-full bg-[rgba(78,135,102,0.2)] border border-[rgba(78,135,102,0.4)] flex items-center justify-center text-[#4ade80]">
          <CheckCheck className="w-4 h-4" />
        </div>
      </div>

      <div className="divide-y divide-[rgba(243,240,223,0.08)] my-3">
        {summaryItems.map((item) => (
          <div
            key={item.id}
            className="py-3 flex items-start justify-between gap-3 group"
          >
            <div className="min-w-0">
              <span className="text-xs font-mono text-[rgba(243,240,223,0.5)] block mb-0.5">
                {item.label}
              </span>
              <p className="text-sm font-medium text-[#f3f0df] break-words">
                {item.value}
              </p>
            </div>
            {onEditField && (
              <button
                type="button"
                onClick={() => onEditField(item.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-[#18241e] text-[rgba(243,240,223,0.6)] hover:text-[#62a57f]"
                title="Edit this answer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {onContinue && (
        <div className="pt-3 border-t border-[rgba(243,240,223,0.12)] flex justify-end">
          <button
            type="button"
            onClick={onContinue}
            className="min-h-[44px] px-5 py-2.5 bg-[#4e8766] hover:bg-[#5ca37c] text-[#f3f0df] font-medium text-sm rounded-sm transition-colors flex items-center gap-2"
          >
            <span>Continue to Next Section</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
