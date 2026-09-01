"use client";

import React from "react";
import { IntakeFormData } from "@/types/schema";
import { CheckCheck, Edit3, ShieldCheck } from "lucide-react";

interface ReviewCardProps {
  formData: IntakeFormData;
  onEditField?: (questionId: string) => void;
  onConfirmSubmit?: () => void;
  isCompleted?: boolean;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  formData,
  onEditField,
  onConfirmSubmit,
  isCompleted = false,
}) => {

  const sections = [
    {
      id: "A",
      title: "Section A • Personal & Family History",
      items: [
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
              : "None reported",
        },
        {
          id: "q4",
          label: "Noticed pattern",
          value:
            formData.pattern && formData.pattern.length > 0
              ? formData.pattern.join(", ")
              : "Not provided",
        },
      ],
    },
    {
      id: "B",
      title: "Section B • Health & Hormonal Factors",
      items: [
        {
          id: "q5",
          label: "Diagnosed conditions",
          value:
            formData.diagnosed_conditions && formData.diagnosed_conditions.length > 0
              ? formData.diagnosed_conditions.join(", ")
              : "None",
        },
        {
          id: "q6_q7_hormonal",
          label: "Menstrual & reproductive cycle",
          value: `Cycle: ${formData.menstrual_cycle || "Not applicable"} • Pregnancy: ${formData.pregnancy_related || "Not applicable"}`,
        },
        {
          id: "q8_q9_skin",
          label: "Skin & body androgen markers",
          value: `Acne/oily skin: ${formData.adult_acne_oily_skin ? "Yes" : "No"} • Excess facial/body hair: ${formData.excess_body_facial_hair ? "Yes" : "No"}`,
        },
      ],
    },
    {
      id: "C",
      title: "Section C • Lifestyle & Environmental Triggers",
      items: [
        {
          id: "q11_smoking",
          label: "Smoking & nicotine",
          value: formData.habits?.smoking
            ? `Smoker (${formData.habits.smoking_severity || "Regular"})`
            : "Non-smoker",
        },
        {
          id: "q11_alcohol",
          label: "Alcohol consumption",
          value: formData.habits?.alcohol ? "Yes" : "No",
        },
        {
          id: "q11_hard_water",
          label: "Wash water type",
          value: formData.habits?.hard_water ? "Hard water / Borewell" : "Normal / RO filtered",
        },
        {
          id: "q11_hair_wash_frequency",
          label: "Hair wash frequency",
          value: formData.habits?.hair_wash_frequency || "Alternate Days",
        },
        {
          id: "q11_heating_tools",
          label: "Heat styling & tools",
          value: formData.habits?.heating_tools_styling_chemicals ? "Yes" : "No",
        },
        {
          id: "q11_salon_treatments",
          label: "Salon chemical treatments",
          value: formData.habits?.salon_treatments
            ? `Yes (${formData.habits.salon_treatment_detail || "Details provided"})`
            : "None in past year",
        },
        {
          id: "q10_past_6_months",
          label: "Past 6 months physiological stressors",
          value:
            formData.past_6_months && formData.past_6_months.length > 0
              ? formData.past_6_months.join(", ")
              : "None reported",
        },
      ],
    },
    {
      id: "D",
      title: "Section D • Current Hair Care & Treatments",
      items: [
        {
          id: "q12_products_select",
          label: "Products & Medications used",
          value: (() => {
            const used = (formData.products || []).filter((p) => p.used);
            if (used.length === 0) return "None / Just regular shampoo";
            return used
              .map(
                (p) =>
                  `${p.name} [Duration: ${p.duration || "N/A"}, Helped: ${p.helped ? "Yes" : "No"}, Side effects: ${p.side_effects ? "Yes" : "No"}]`
              )
              .join("; ");
          })(),
        },
        {
          id: "q13_procedures_gate",
          label: "Clinical procedures undergone",
          value: (() => {
            const done = (formData.procedures || []).filter((p) => p.done);
            if (done.length === 0) return "No clinical procedures";
            return done
              .map((p) => `${p.name} [Sessions: ${p.sessions || "N/A"}, Helped: ${p.helped ? "Yes" : "No"}]`)
              .join("; ");
          })(),
        },
        {
          id: "q14_side_effects_gate",
          label: "Adverse treatment reactions",
          value: formData.past_treatment_side_effects
            ? `Yes: ${formData.past_treatment_side_effects_describe || "Reported"}`
            : "No side effects or adverse reactions",
        },
      ],
    },
    {
      id: "E",
      title: "Section E • Sample Collection & Clinical Consent",
      items: [
        {
          id: "q15_sample_type",
          label: "Genomic sample preference",
          value: formData.sample_type ? `${formData.sample_type} collection` : "Not selected",
        },
        {
          id: "q16_consent",
          label: "Genetic analysis & data consent",
          value: formData.consent ? "✓ Consent Granted (Confidential & Encrypted)" : "Not Granted",
        },
      ],
    },
  ];

  return (
    <div className="w-full my-4 bg-[#141d18] border border-[rgba(78,135,102,0.45)] rounded-sm shadow-xl animate-fade-in overflow-hidden">
      {/* Top Banner */}
      <div className="bg-[#18241e] border-b border-[rgba(243,240,223,0.12)] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#62a57f] bg-[rgba(78,135,102,0.2)] px-2 py-0.5 rounded-sm">
              Clinical Intake Summary
            </span>
            <span className="text-[10px] font-mono text-[rgba(243,240,223,0.5)]">
              16/16 Questions Answered
            </span>
          </div>
          <h3 className="text-xl font-serif text-[#f3f0df]">
            GenoRoot Clinical Assessment Brief
          </h3>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="w-8 h-8 rounded-full bg-[rgba(78,135,102,0.25)] border border-[#62a57f] flex items-center justify-center text-[#4ade80]">
            <CheckCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Sections Accordion / Listing */}
      <div className="p-4 sm:p-6 space-y-4">
        {sections.map((sec) => (
          <div
            key={sec.id}
            className="border border-[rgba(243,240,223,0.1)] bg-[#101713] rounded-sm overflow-hidden"
          >
            <div className="px-4 py-3 bg-[#16201b] border-b border-[rgba(243,240,223,0.08)] flex items-center justify-between">
              <h4 className="text-xs font-mono tracking-wide uppercase text-[#a7f3d0]">
                {sec.title}
              </h4>
              <span className="text-[11px] font-mono text-[rgba(243,240,223,0.4)]">
                {sec.items.length} fields
              </span>
            </div>

            <div className="divide-y divide-[rgba(243,240,223,0.06)] px-4">
              {sec.items.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-start justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-mono text-[rgba(243,240,223,0.5)] block mb-0.5">
                      {item.label}
                    </span>
                    <p className="text-sm font-sans text-[#f3f0df] leading-snug break-words">
                      {item.value}
                    </p>
                  </div>
                  {onEditField && (
                    <button
                      type="button"
                      onClick={() => onEditField(item.id)}
                      className="opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-[#18241e] text-[rgba(243,240,223,0.6)] hover:text-[#62a57f] shrink-0"
                      title="Edit this answer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Completion / Confirmation Footer */}
      <div className="p-5 sm:p-6 bg-[#18241e] border-t border-[rgba(243,240,223,0.12)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-mono text-[rgba(243,240,223,0.6)]">
          <ShieldCheck className="w-4 h-4 text-[#62a57f]" />
          <span>Encrypted • Confidential to attending clinical team</span>
        </div>

        {onConfirmSubmit && !isCompleted && (
          <button
            type="button"
            onClick={onConfirmSubmit}
            className="w-full sm:w-auto min-h-[48px] px-7 py-3 bg-[#4e8766] hover:bg-[#5ca37c] active:bg-[#3d7054] text-[#f3f0df] font-medium text-sm rounded-sm transition-all shadow-lg flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#62a57f]"
          >
            <span>Confirm &amp; Complete Intake</span>
            <CheckCheck className="w-4 h-4" />
          </button>
        )}

        {isCompleted && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[rgba(78,135,102,0.2)] border border-[#62a57f] rounded-sm text-[#4ade80] text-xs font-mono">
            <CheckCheck className="w-4 h-4" />
            <span>Intake Submitted to Dr. Sharma</span>
          </div>
        )}
      </div>
    </div>
  );
};

