import { generateText, Output } from "ai";
import { sarvam } from "sarvam-ai-sdk";
import { z } from "zod";
import { IntakeFormData } from "@/types/schema";

export interface DoctorTriageBriefing {
  suspected_phenotype: string;
  red_flags: string[];
  contraindications: string[];
  talking_points: string[];
  disclaimer: string;
}

export interface TriageProvider {
  generateTriage(formData: IntakeFormData): Promise<DoctorTriageBriefing>;
}


export const TriageSchema = z.object({
  suspected_phenotype: z
    .string()
    .describe("Suspected clinical hair loss phenotype or differential diagnosis"),
  red_flags: z
    .array(z.string())
    .describe("Clinical warning signs, early discontinuations, or exacerbating triggers"),
  contraindications: z
    .array(z.string())
    .describe("Contraindications or medication alerts based on patient sex, age, or health"),
  talking_points: z
    .array(z.string())
    .describe("Recommended doctor consultation discussion points"),
  confidence: z.number().min(0).max(1).optional(),
});

const DEFAULT_DISCLAIMER =
  "AI-generated preliminary assessment — not a diagnosis. For attending clinical team review only.";

// 1. Mock Triage Provider (Deterministic, Offline & Personas)
export class MockTriageProvider implements TriageProvider {
  async generateTriage(formData: IntakeFormData): Promise<DoctorTriageBriefing> {
    const age = formData.age_hair_loss_began;
    const pattern = (formData.pattern || []).join(" ").toLowerCase();
    const family = (formData.family_history || []).join(" ").toLowerCase();
    const pastEvents = (formData.past_6_months || []).join(" ").toLowerCase();
    const conditions = (formData.diagnosed_conditions || []).join(" ").toLowerCase();
    const pregnancy = (formData.pregnancy_related || "").toLowerCase();
    const smoking = formData.habits?.smoking;
    const hardWater = formData.habits?.hard_water;

    const usedProducts = formData.products || [];
    const minoxidilUsed = usedProducts.find((p) =>
      p.name.toLowerCase().includes("minoxidil")
    );

    let suspected_phenotype = "Indeterminate Alopecia / Early Hair Density Shift";
    const red_flags: string[] = [];
    const contraindications: string[] = [];
    const talking_points: string[] = [];

    // Persona 1: Rajesh (45M, Crown thinning, Minoxidil dropout, Smoker, Father baldness)
    if (
      pattern.includes("crown") ||
      (age && age >= 40 && family.includes("father"))
    ) {
      suspected_phenotype = "Androgenetic Alopecia (Norwood III Vertex pattern)";

      if (minoxidilUsed && minoxidilUsed.duration === "<3mo") {
        red_flags.push(
          "Patient discontinued Topical Minoxidil early (< 3 months) — likely misidentified initial telogen shedding (dread-shed) as treatment failure."
        );
      }

      if (smoking) {
        red_flags.push(
          `Active smoker (${formData.habits?.smoking_severity || "regular"}) — nicotine vasoconstriction compromises follicular microcirculation.`
        );
      }

      contraindications.push(
        "Screen baseline scalp barrier before prescribing alcoholic minoxidil formulations to avoid dermatitis exacerbation."
      );

      talking_points.push(
        "Counsel patient on the 4–6 month biological timeline for minoxidil efficacy and normalize initial shedding phase."
      );
      talking_points.push(
        "Discuss combination therapy with 5-alpha reductase inhibitor (Oral Finasteride 1mg or topical finasteride blend) with PSA baseline."
      );
      talking_points.push(
        "Perform scalp dermoscopy at vertex vs occipital zone to quantify miniaturization percentage."
      );
    }
    // Persona 2: Priya (27F, Post-Dengue shedding, PCOS, Hard water)
    else if (
      pastEvents.includes("dengue") ||
      pastEvents.includes("fever") ||
      pattern.includes("shedding") ||
      conditions.includes("pcos")
    ) {
      suspected_phenotype =
        "Acute Post-Febrile Telogen Effluvium secondary to Dengue, with underlying PCOS androgenic predisposition";

      if (pastEvents.includes("dengue") || pastEvents.includes("fever")) {
        red_flags.push(
          "Shedding onset closely matches classic 2–3 month physiological lag following high-grade febrile illness (Dengue fever)."
        );
      }

      if (conditions.includes("pcos")) {
        red_flags.push(
          "Underlying PCOS and irregular menstrual cycles indicate hormonal vulnerability to prolonged follicular recovery."
        );
      }

      if (hardWater) {
        red_flags.push(
          "Use of hard borewell water contributes to mineral buildup, cuticle brittleness, and secondary scalp irritation."
        );
      }

      contraindications.push(
        "Avoid aggressive chemical rebonding or high-heat styling while telogen hair anchors remain fragile."
      );
      contraindications.push(
        "Monitor for facial hypertrichosis if starting topical minoxidil in the presence of hyperandrogenism."
      );

      talking_points.push(
        "Reassure patient regarding self-limiting nature of post-febrile shedding (typical resolution within 6 to 9 months)."
      );
      talking_points.push(
        "Order targeted lab panel: Serum Ferritin, Vitamin D3, TSH, and Free/Bioavailable Testosterone."
      );
      talking_points.push(
        "Recommend chelating shampoo or RO water final rinse to eliminate hard water salt deposition."
      );
    }
    // Persona 3: Ananya (34F, Postpartum, Thyroid)
    else if (
      pregnancy.includes("postpartum") ||
      conditions.includes("thyroid")
    ) {
      suspected_phenotype =
        "Postpartum Telogen Effluvium with autoimmune/thyroid metabolic overlap";

      if (pregnancy.includes("postpartum")) {
        red_flags.push(
          "Postpartum timeline (<1 year) indicates profound estrogen withdrawal shedding compounded by maternal nutritional depletion."
        );
      }

      if (conditions.includes("thyroid")) {
        red_flags.push(
          "Concomitant thyroid disorder may prolong shedding and impede anagen reentry."
        );
      }

      contraindications.push(
        "Oral 5-alpha reductase inhibitors (Finasteride/Dutasteride) are strictly contraindicated in postpartum and nursing patients."
      );

      talking_points.push(
        "Verify latest TSH/FT4 levels to ensure euthyroid state prior to escalating treatment."
      );
      talking_points.push(
        "Prescribe clinical-grade nutritional support (amino acids, iron, zinc, and methylated B-complex)."
      );
      talking_points.push(
        "Reassure patient that postpartum shedding is physiologically expected and has a high spontaneous recovery rate by 12–15 months."
      );
    }
    // General Fallback
    else {
      if (pattern.includes("receding") || pattern.includes("temples")) {
        suspected_phenotype = "Frontotemporal Androgenetic Alopecia";
      } else if (pattern.includes("diffuse")) {
        suspected_phenotype = "Chronic Diffuse Telogen Hair Loss";
      }

      if (family.includes("father") || family.includes("mother")) {
        red_flags.push(
          "Positive hereditary genetic predisposition noted on first-degree relative axis."
        );
      }

      if (smoking) {
        red_flags.push(
          "Active smoking status contributes to follicular oxidative stress."
        );
      }

      if (red_flags.length === 0) {
        red_flags.push(
          "No acute systemic red flags reported in pre-intake survey."
        );
      }

      contraindications.push(
        "Verify drug allergy profile and baseline liver/renal panel before prescribing oral interventions."
      );

      talking_points.push(
        "Perform baseline clinical trichoscopy (hair diameter diversity and peripilar signs)."
      );
      talking_points.push(
        "Establish personalized hair preservation roadmap and patient expectations on therapy adherence."
      );
    }

    return {
      suspected_phenotype,
      red_flags,
      contraindications,
      talking_points,
      disclaimer: DEFAULT_DISCLAIMER,
    };
  }
}


// 2. Sarvam 105B Triage Provider
export class SarvamTriageProvider implements TriageProvider {
  private apiKey?: string;
  private fallbackProvider: MockTriageProvider;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SARVAM_API_KEY;
    this.fallbackProvider = new MockTriageProvider();
  }

  async generateTriage(formData: IntakeFormData): Promise<DoctorTriageBriefing> {
    if (!this.apiKey) {
      console.warn(
        "Sarvam API key not found. Using MockTriageProvider for clinical briefing."
      );
      return this.fallbackProvider.generateTriage(formData);
    }

    try {
      const modelInstance = sarvam("sarvam-105b", {
        reasoning_effort: "none",
      });

      const prompt = `You are an expert trichology and dermatology clinical AI specialist assisting Dr. Sharma at Haiku Hair & Scalp Clinic.
You are given a completed 16-question patient clinical intake form:
${JSON.stringify(formData, null, 2)}

Provide a structured, high-priority 10-second pre-consult clinical briefing for Dr. Sharma before he examines the patient:
1. suspected_phenotype: Precise clinical diagnosis or differential (e.g. "Androgenetic Alopecia (Norwood III Vertex)", "Acute Post-Febrile Telogen Effluvium secondary to Dengue", "Female Pattern Hair Loss (Ludwig I)").
2. red_flags: List 1 to 3 critical clinical warning signs or pitfalls (e.g. Minoxidil discontinued at Day 10 due to perceived shedding — likely dread-shed; heavy smoking causing micro-vascular compromise; rapid weight loss / fever 3 months prior).
3. contraindications: List 1 to 2 pharmacological or procedural contraindications (e.g. anti-androgens in female of childbearing age / postpartum; minoxidil caution with active scalp dermatitis).
4. talking_points: 2 to 4 actionable consultation discussion points and recommended diagnostic/lab investigations.

Maintain high clinical precision and brevity.`;

      const { output } = await generateText({
        model: modelInstance,
        output: Output.object({
          name: "DoctorTriageBriefing",
          description: "Dr. Sharma's pre-consult clinical triage card",
          schema: TriageSchema,
        }),
        prompt,
      });

      return {
        suspected_phenotype: output.suspected_phenotype,
        red_flags: output.red_flags,
        contraindications: output.contraindications,
        talking_points: output.talking_points,
        disclaimer: DEFAULT_DISCLAIMER,
      };

    } catch (error) {
      console.error(
        "Error generating triage briefing from Sarvam 105B. Falling back to mock:",
        error
      );
      return this.fallbackProvider.generateTriage(formData);
    }
  }
}

/**
 * Provider factory for clinical triage generation
 */
export function getTriageProvider(providerType?: string): TriageProvider {
  const chosenType =
    providerType ||
    process.env.TRIAGE_PROVIDER ||
    process.env.AI_PROVIDER ||
    (process.env.SARVAM_API_KEY ? "sarvam" : "mock");

  if (chosenType === "mock") {
    return new MockTriageProvider();
  }

  return new SarvamTriageProvider();
}
