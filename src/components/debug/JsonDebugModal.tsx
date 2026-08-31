"use client";

import React, { useState } from "react";
import { IntakeFormData } from "@/types/schema";
import { X, Copy, Check, Terminal } from "lucide-react";

interface JsonDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: IntakeFormData;
}

export const JsonDebugModal: React.FC<JsonDebugModalProps> = ({
  isOpen,
  onClose,
  formData,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Schema-structured representation
  const outputJson = {
    form: "GenoRoot Hair & Scalp Intake",
    timestamp: new Date().toISOString(),
    intake_data: formData,
  };

  const jsonString = JSON.stringify(outputJson, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy JSON:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#141d18] border border-[rgba(243,240,223,0.2)] rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(243,240,223,0.12)] bg-[#18241e]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#62a57f]" />
            <h3 className="text-sm font-mono text-[#f3f0df]">
              intake-schema.json • Live Debug Output
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-[#1f2e27] hover:bg-[#283d33] text-[#f3f0df] border border-[rgba(243,240,223,0.18)] rounded transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span className="text-[#4ade80]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[#1f2e27] text-[rgba(243,240,223,0.6)] hover:text-[#f3f0df] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* JSON Code Viewer */}
        <div className="p-4 overflow-auto flex-1 font-mono text-xs text-[#a7f3d0] bg-[#0d1410] leading-relaxed">
          <pre className="whitespace-pre-wrap">{jsonString}</pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#18241e] border-t border-[rgba(243,240,223,0.1)] flex items-center justify-between text-[11px] font-mono text-[rgba(243,240,223,0.5)]">
          <span>Schema: GenoRoot Hair &amp; Scalp v1.0</span>
          <span>Fields populated: {Object.keys(formData).length}</span>
        </div>
      </div>
    </div>
  );
};
