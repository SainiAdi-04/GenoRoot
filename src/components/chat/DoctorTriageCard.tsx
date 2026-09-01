"use client";

import React from "react";
import { DoctorTriageBriefing } from "@/lib/triageService";
import {
  Stethoscope,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface DoctorTriageCardProps {
  triage: DoctorTriageBriefing | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const DoctorTriageCard: React.FC<DoctorTriageCardProps> = ({
  triage,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <div className="w-full bg-[#121c17] border border-[#62a57f]/40 p-5 sm:p-6 rounded-sm shadow-xl animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#62a57f] to-transparent animate-pulse" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-sm bg-[#1b2b22] border border-[#62a57f]/50 flex items-center justify-center text-[#a7f3d0]">
            <Stethoscope className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#a7f3d0]">
                Sarvam 105B Intelligence
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-[#4ade80] animate-ping" />
            </div>
            <h3 className="text-sm font-semibold text-[#f3f0df] font-sans">
              Generating Dr. Sharma&apos;s briefing…
            </h3>

          </div>
        </div>

        {/* Loading skeleton lines */}
        <div className="space-y-3 pt-2">
          <div className="h-4 bg-[#1a2620] rounded-sm w-3/4 animate-pulse" />
          <div className="h-4 bg-[#1a2620] rounded-sm w-full animate-pulse [animation-delay:0.15s]" />
          <div className="h-4 bg-[#1a2620] rounded-sm w-5/6 animate-pulse [animation-delay:0.3s]" />
        </div>

        <p className="text-xs font-mono text-[rgba(243,240,223,0.5)] mt-4 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#62a57f]" />
          Synthesizing 16 intake markers into a 10-second physician brief…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-[#1e1515] border border-[#ef4444]/30 p-5 rounded-sm shadow-md animate-fade-in">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#ef4444] text-xs font-mono">
            <AlertTriangle className="w-4 h-4" />
            <span>Could not load automated clinical briefing ({error})</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1.5 bg-[#2a1a1a] hover:bg-[#382222] text-[#f3f0df] text-xs font-mono rounded-sm border border-[#ef4444]/40 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!triage) {
    return null;
  }

  return (
    <section
      aria-label="Doctor's Pre-Consult Triage Card"
      className="w-full bg-gradient-to-b from-[#141f19] to-[#0f1713] border-2 border-[#62a57f]/50 rounded-sm shadow-2xl overflow-hidden animate-fade-in mb-6"
    >
      {/* Top Clinical Header Bar */}
      <div className="px-5 py-3.5 bg-[#17251e] border-b border-[#62a57f]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm bg-[#1e3328] border border-[#62a57f] flex items-center justify-center text-[#4ade80] shadow-sm">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest uppercase bg-[#1f382a] text-[#86efac] px-2 py-0.5 rounded-sm border border-[#62a57f]/40 font-semibold">
                DOCTOR&apos;S PRE-CONSULT TRIAGE
              </span>
              <span className="text-[10px] font-mono text-[rgba(243,240,223,0.5)]">
                10-Second Briefing
              </span>
            </div>
            <h3 className="text-sm font-semibold text-[#f3f0df] tracking-tight">
              Dr. Sharma&apos;s Clinical Assessment
            </h3>
          </div>
        </div>

        {/* Disclaimer Pill */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#a7f3d0] bg-[#122219] px-2.5 py-1 rounded border border-[#62a57f]/30 self-start sm:self-center">
          <ShieldCheck className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
          <span>AI-generated preliminary assessment — not a diagnosis</span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* 1. Suspected Phenotype / Diagnosis */}
        <div className="border-l-4 border-[#4ade80] pl-4 py-1 bg-[#16231c]/60 rounded-r-sm">
          <span className="text-[11px] font-mono tracking-wider uppercase text-[rgba(243,240,223,0.6)] block mb-1">
            Suspected Phenotype / Differential
          </span>
          <p className="text-lg sm:text-xl font-serif font-bold text-[#f3f0df] leading-snug tracking-tight">
            {triage.suspected_phenotype}
          </p>
        </div>

        {/* 2. Red Flags & Triggers */}
        {triage.red_flags && triage.red_flags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#fca5a5]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#ef4444]" />
              <span className="font-semibold">Clinical Red Flags &amp; Timing Warnings</span>
            </div>
            <div className="space-y-2">
              {triage.red_flags.map((flag, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 px-3.5 py-2.5 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] rounded-sm text-xs font-sans text-[#fee2e2] leading-relaxed"
                >
                  <span className="font-mono text-[#ef4444] font-bold text-xs shrink-0 mt-0.5">
                    ⚠️
                  </span>
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Contraindication Alerts */}
        {triage.contraindications && triage.contraindications.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#fcd34d]">
              <AlertOctagon className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span className="font-semibold">Pharmacological &amp; Safety Contraindications</span>
            </div>
            <div className="space-y-2">
              {triage.contraindications.map((contra, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 px-3.5 py-2.5 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] rounded-sm text-xs font-sans text-[#fef3c7] leading-relaxed"
                >
                  <span className="font-mono text-[#f59e0b] font-bold text-xs shrink-0 mt-0.5">
                    🚫
                  </span>
                  <span>{contra}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Consultation Talking Points */}
        {triage.talking_points && triage.talking_points.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-[rgba(243,240,223,0.08)]">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#a7f3d0] pt-2">
              <Sparkles className="w-3.5 h-3.5 text-[#62a57f]" />
              <span className="font-semibold">Recommended Consultation Talking Points</span>
            </div>
            <ul className="space-y-2 text-xs font-sans text-[rgba(243,240,223,0.9)]">
              {triage.talking_points.map((point, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 bg-[#121c17] px-3.5 py-2.5 rounded-sm border border-[rgba(243,240,223,0.07)] leading-relaxed"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#62a57f] shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};

