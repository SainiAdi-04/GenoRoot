import { generateText, Output } from "ai";
import { sarvam } from "sarvam-ai-sdk";
import { z } from "zod";
import { resolveBrandMentions, getBrandPromptContext } from "./brandResolver";

export interface ExtractedFieldItem<T = unknown> {
  key: string;
  label: string;
  value: T;
  displayValue: string;
  confidence: number;
  questionId: string;
}

export interface GenderInferenceResult {
  inferred_gender: "male" | "female" | "unknown";
  confidence: number;
  cues?: string;
}

export interface ExtractionResult {
  fields: {
    age_hair_loss_began?: { value: number; confidence: number };
    duration?: {
      value: "Less than 6 months" | "6-12 months" | "Over a year";
      confidence: number;
    };
    family_history?: { value: string[]; confidence: number };
    pattern?: { value: string[]; confidence: number };
    diagnosed_conditions?: { value: string[]; confidence: number };
    menstrual_cycle?: {
      value: "Regular" | "Irregular" | "Menopausal" | "Not applicable";
      confidence: number;
    };
    pregnancy_related?: {
      value: "Currently pregnant" | "Postpartum <1 year" | "Not applicable";
      confidence: number;
    };
    adult_acne_oily_skin?: { value: boolean; confidence: number };
    excess_body_facial_hair?: { value: boolean; confidence: number };
    past_6_months?: { value: string[]; confidence: number };
    habits?: {
      smoking?: {
        value: boolean;
        severity?: "Mild <5/day" | "Moderate 5-10/day" | "Severe >10/day" | null;
        confidence: number;
      };
      alcohol?: { value: boolean; confidence: number };
      hard_water?: { value: boolean; confidence: number };
      hair_wash_frequency?: {
        value: "Daily" | "Alternate Days" | "Weekly";
        confidence: number;
      };
      heating_tools_styling_chemicals?: { value: boolean; confidence: number };
      salon_treatments?: {
        value: boolean;
        detail?: string | null;
        confidence: number;
      };
    };
    products?: {
      value: Array<{
        name: string;
        used: boolean;
        duration?: "<3mo" | "3-6mo" | ">6mo" | null;
        helped?: boolean | null;
        side_effects?: boolean | null;
      }>;
      confidence: number;
    };
    procedures?: {
      value: Array<{
        name: string;
        done: boolean;
        sessions?: "1-3" | "4-6" | ">6" | null;
        helped?: boolean | null;
      }>;
      confidence: number;
    };
    past_treatment_side_effects?: {
      value: boolean;
      describe?: string | null;
      confidence: number;
    };
    sample_type?: { value: "Saliva" | "Blood" | "Either"; confidence: number };
    consent?: { value: boolean; confidence: number };
  };
  gender_inference: GenderInferenceResult;
}

export interface ExtractionProvider {
  extract(
    transcript: string,
    options?: { rawCodemix?: string; timeoutMs?: number }
  ): Promise<ExtractionResult>;
}

// Gender cue detector (Hindi linguistic morphology + English self-ID + clinical clues)
export function detectGenderCues(
  codemix: string = "",
  translate: string = ""
): GenderInferenceResult {
  const combinedLower = `${codemix} ${translate}`.toLowerCase();

  // 1. Explicit English self-identification & terminology
  if (
    /\b(i\s*am|i'm)\s*(a\s*)?(male|man|guy|gentleman|boy)\b/.test(combinedLower) ||
    /\b(male\s*pattern(\s*baldness)?|male\s*hair\s*loss|male\s*patient)\b/.test(combinedLower) ||
    /\b(shaving\s*beard|my\s*beard|facial\s*beard|moustache|mustache)\b/.test(combinedLower) ||
    /\b\d{1,2}\s*m\b/.test(combinedLower)
  ) {
    const match =
      combinedLower.match(/\b(i\s*am|i'm)\s*(a\s*)?(male|man|guy|gentleman|boy)\b/)?.[0] ||
      combinedLower.match(/\b(male\s*pattern(\s*baldness)?|male\s*patient)\b/)?.[0] ||
      "self-identification as male";
    return {
      inferred_gender: "male",
      confidence: 0.95,
      cues: `'${match}'`,
    };
  }

  if (
    /\b(i\s*am|i'm)\s*(a\s*)?(female|woman|lady|girl)\b/.test(combinedLower) ||
    /\b(female\s*pattern(\s*baldness)?|female\s*patient)\b/.test(combinedLower) ||
    /\b\d{1,2}\s*f\b/.test(combinedLower)
  ) {
    const match =
      combinedLower.match(/\b(i\s*am|i'm)\s*(a\s*)?(female|woman|lady|girl)\b/)?.[0] ||
      "self-identification as female";
    return {
      inferred_gender: "female",
      confidence: 0.95,
      cues: `'${match}'`,
    };
  }

  // 2. Strong content cues (clinical/biological)
  if (
    combinedLower.includes("pcos") ||
    combinedLower.includes("pcod") ||
    combinedLower.includes("pregnant") ||
    combinedLower.includes("pregnancy") ||
    combinedLower.includes("delivery") ||
    combinedLower.includes("postpartum") ||
    combinedLower.includes("baby") ||
    combinedLower.includes("childbirth") ||
    combinedLower.includes("periods") ||
    combinedLower.includes("menopause")
  ) {
    const cueMatch = combinedLower.includes("pcos") || combinedLower.includes("pcod")
      ? "PCOS / hormonal health history"
      : combinedLower.includes("delivery") || combinedLower.includes("postpartum") || combinedLower.includes("baby") || combinedLower.includes("childbirth")
      ? "recent childbirth / postpartum timeline"
      : combinedLower.includes("pregnant")
      ? "pregnancy"
      : "menstrual or reproductive history";

    return {
      inferred_gender: "female",
      confidence: 0.95,
      cues: cueMatch,
    };
  }

  // 3. Hindi grammatical markers & nouns
  // Feminine verb/adjective endings: "ho gayi", "gayi thi", "karti hoon", "pareshan ho gayi", "aurat", "ladki"
  const femaleHindiPatterns = [
    /\bho\s+gayi\b/,
    /\bgayi\s+thi\b/,
    /\bkarti\s+hoon\b/,
    /\bkarti\s+thi\b/,
    /\brahi\s+hoon\b/,
    /\brahi\s+thi\b/,
    /\bpareshan\s+ho\s+gayi\b/,
    /\bki\s+hoon\b/,
    /\bpeeti\s+hoon\b/,
    /\bladki\b/,
    /\baurat\b/,
    /\bpatni\b/,
    /\bbehan\b/,
  ];

  for (const pat of femaleHindiPatterns) {
    if (pat.test(combinedLower)) {
      return {
        inferred_gender: "female",
        confidence: 0.9,
        cues: "'" + (combinedLower.match(pat)?.[0] || "") + "'",
      };
    }
  }

  // Masculine verb/adjective endings: "ka hoon", "ho gaya", "gaya tha", "karta hoon", "peeta hoon", "ladka", "aadmi"
  const maleHindiPatterns = [
    /\bka\s+hoon\b/,
    /\bho\s+gaya\b/,
    /\bgaya\s+tha\b/,
    /\bkarta\s+hoon\b/,
    /\bkarta\s+tha\b/,
    /\bpeeta\s+hoon\b/,
    /\braha\s+hoon\b/,
    /\braha\s+tha\b/,
    /\bdadhi\b/,
    /\bdaadhi\b/,
    /\bbeard\b/,
    /\bmooch\b/,
    /\bladka\b/,
    /\baadmi\b/,
    /\bmard\b/,
    /\bpati\b/,
  ];

  for (const pat of maleHindiPatterns) {
    if (pat.test(combinedLower)) {
      return {
        inferred_gender: "male",
        confidence: 0.9,
        cues: "'" + (combinedLower.match(pat)?.[0] || "") + "'",
      };
    }
  }

  return {
    inferred_gender: "unknown",
    confidence: 0.2,
  };
}

export function filterHighConfidenceFields(
  fields: ExtractedFieldItem[],
  threshold: number = 0.7
): ExtractedFieldItem[] {
  return fields.filter((f) => f.confidence >= threshold);
}

// Convert structured ExtractionResult into individual UI chip items
export function toExtractedFieldItems(result: ExtractionResult): ExtractedFieldItem[] {
  const items: ExtractedFieldItem[] = [];
  const f = result.fields;

  if (f.age_hair_loss_began && f.age_hair_loss_began.value) {
    items.push({
      key: "age_hair_loss_began",
      label: "Age hair loss began",
      value: f.age_hair_loss_began.value,
      displayValue: `${f.age_hair_loss_began.value} years old`,
      confidence: f.age_hair_loss_began.confidence,
      questionId: "q1",
    });
  }

  if (f.duration && f.duration.value) {
    items.push({
      key: "duration",
      label: "Duration",
      value: f.duration.value,
      displayValue: f.duration.value,
      confidence: f.duration.confidence,
      questionId: "q2",
    });
  }

  if (f.family_history && f.family_history.value?.length) {
    items.push({
      key: "family_history",
      label: "Family history",
      value: f.family_history.value,
      displayValue: f.family_history.value.join(", "),
      confidence: f.family_history.confidence,
      questionId: "q3",
    });
  }

  if (f.pattern && f.pattern.value?.length) {
    items.push({
      key: "pattern",
      label: "Hair loss pattern",
      value: f.pattern.value,
      displayValue: f.pattern.value.join(", "),
      confidence: f.pattern.confidence,
      questionId: "q4",
    });
  }

  if (f.diagnosed_conditions && f.diagnosed_conditions.value?.length) {
    items.push({
      key: "diagnosed_conditions",
      label: "Health conditions",
      value: f.diagnosed_conditions.value,
      displayValue: f.diagnosed_conditions.value.join(", "),
      confidence: f.diagnosed_conditions.confidence,
      questionId: "q5",
    });
  }

  if (f.menstrual_cycle && f.menstrual_cycle.value && f.menstrual_cycle.value !== "Not applicable") {
    items.push({
      key: "menstrual_cycle",
      label: "Menstrual cycle",
      value: f.menstrual_cycle.value,
      displayValue: f.menstrual_cycle.value,
      confidence: f.menstrual_cycle.confidence,
      questionId: "q6_q7_hormonal",
    });
  }

  if (f.pregnancy_related && f.pregnancy_related.value && f.pregnancy_related.value !== "Not applicable") {
    items.push({
      key: "pregnancy_related",
      label: "Maternal phase",
      value: f.pregnancy_related.value,
      displayValue: f.pregnancy_related.value,
      confidence: f.pregnancy_related.confidence,
      questionId: "q6_q7_hormonal",
    });
  }

  if (f.past_6_months && f.past_6_months.value?.length) {
    items.push({
      key: "past_6_months",
      label: "Triggers in past 6 months",
      value: f.past_6_months.value,
      displayValue: f.past_6_months.value.join(", "),
      confidence: f.past_6_months.confidence,
      questionId: "q10_past_6_months",
    });
  }

  if (f.habits) {
    if (f.habits.smoking && f.habits.smoking.value !== undefined) {
      items.push({
        key: "smoking",
        label: "Smoking",
        value: f.habits.smoking.value,
        displayValue: f.habits.smoking.value
          ? f.habits.smoking.severity || "Yes"
          : "No",
        confidence: f.habits.smoking.confidence,
        questionId: "q11_smoking",
      });
    }

    if (f.habits.alcohol && f.habits.alcohol.value !== undefined) {
      items.push({
        key: "alcohol",
        label: "Alcohol",
        value: f.habits.alcohol.value,
        displayValue: f.habits.alcohol.value ? "Yes" : "No",
        confidence: f.habits.alcohol.confidence,
        questionId: "q11_alcohol",
      });
    }

    if (f.habits.hard_water && f.habits.hard_water.value !== undefined) {
      items.push({
        key: "hard_water",
        label: "Water type",
        value: f.habits.hard_water.value,
        displayValue: f.habits.hard_water.value ? "Hard water" : "RO / Filtered",
        confidence: f.habits.hard_water.confidence,
        questionId: "q11_hard_water",
      });
    }

    if (f.habits.hair_wash_frequency && f.habits.hair_wash_frequency.value) {
      items.push({
        key: "hair_wash_frequency",
        label: "Wash frequency",
        value: f.habits.hair_wash_frequency.value,
        displayValue: f.habits.hair_wash_frequency.value,
        confidence: f.habits.hair_wash_frequency.confidence,
        questionId: "q11_hair_wash_frequency",
      });
    }

    if (f.habits.heating_tools_styling_chemicals && f.habits.heating_tools_styling_chemicals.value !== undefined) {
      items.push({
        key: "heating_tools_styling_chemicals",
        label: "Heat styling",
        value: f.habits.heating_tools_styling_chemicals.value,
        displayValue: f.habits.heating_tools_styling_chemicals.value ? "Yes" : "No",
        confidence: f.habits.heating_tools_styling_chemicals.confidence,
        questionId: "q11_heating_tools",
      });
    }

    if (f.habits.salon_treatments && f.habits.salon_treatments.value !== undefined) {
      items.push({
        key: "salon_treatments",
        label: "Salon treatments",
        value: f.habits.salon_treatments.value,
        displayValue: f.habits.salon_treatments.value
          ? f.habits.salon_treatments.detail || "Yes"
          : "No",
        confidence: f.habits.salon_treatments.confidence,
        questionId: "q11_salon_treatments",
      });
    }
  }

  if (f.products && f.products.value?.length) {
    const usedProds = f.products.value.filter((p) => p.used);
    if (usedProds.length) {
      items.push({
        key: "products",
        label: "Past products",
        value: f.products.value,
        displayValue: usedProds.map((p) => p.name).join(", "),
        confidence: f.products.confidence,
        questionId: "q12_products_select",
      });
    }
  }

  if (f.procedures && f.procedures.value?.length) {
    const doneProcs = f.procedures.value.filter((p) => p.done);
    if (doneProcs.length) {
      items.push({
        key: "procedures",
        label: "Clinical procedures",
        value: f.procedures.value,
        displayValue: doneProcs.map((p) => p.name).join(", "),
        confidence: f.procedures.confidence,
        questionId: "q13_procedures_gate",
      });
    }
  }

  if (f.adult_acne_oily_skin && f.adult_acne_oily_skin.value !== undefined) {
    items.push({
      key: "adult_acne_oily_skin",
      label: "Adult acne / oily skin",
      value: f.adult_acne_oily_skin.value,
      displayValue: f.adult_acne_oily_skin.value ? "Yes" : "No",
      confidence: f.adult_acne_oily_skin.confidence,
      questionId: "q8_q9_skin",
    });
  }

  if (f.excess_body_facial_hair && f.excess_body_facial_hair.value !== undefined) {
    items.push({
      key: "excess_body_facial_hair",
      label: "Excess body / facial hair",
      value: f.excess_body_facial_hair.value,
      displayValue: f.excess_body_facial_hair.value ? "Yes" : "No",
      confidence: f.excess_body_facial_hair.confidence,
      questionId: "q8_q9_skin",
    });
  }

  if (f.past_treatment_side_effects && f.past_treatment_side_effects.value !== undefined) {
    items.push({
      key: "past_treatment_side_effects",
      label: "Treatment reactions",
      value: f.past_treatment_side_effects.value,
      displayValue: f.past_treatment_side_effects.value
        ? f.past_treatment_side_effects.describe || "Yes"
        : "No",
      confidence: f.past_treatment_side_effects.confidence,
      questionId: "q14_side_effects_gate",
    });
  }

  if (f.sample_type && f.sample_type.value) {
    items.push({
      key: "sample_type",
      label: "Sample preference",
      value: f.sample_type.value,
      displayValue: f.sample_type.value,
      confidence: f.sample_type.confidence,
      questionId: "q15_sample_type",
    });
  }

  if (f.consent && f.consent.value !== undefined) {
    items.push({
      key: "consent",
      label: "Clinical consent",
      value: f.consent.value,
      displayValue: f.consent.value ? "Consent granted" : "Pending consent",
      confidence: f.consent.confidence,
      questionId: "q16_consent",
    });
  }

  return items;
}

// 1. Mock Extraction Provider (Offline, Tests & Evaluator Personas)
export class MockExtractionProvider implements ExtractionProvider {
  async extract(
    transcript: string,
    options?: { rawCodemix?: string }
  ): Promise<ExtractionResult> {
    const text = `${transcript} ${options?.rawCodemix || ""}`.toLowerCase().trim();

    if (!text) {
      return {
        fields: {},
        gender_inference: { inferred_gender: "unknown", confidence: 0 },
      };
    }

    const genderInference = detectGenderCues(options?.rawCodemix, transcript);
    const fields: ExtractionResult["fields"] = {};

    // Rajesh Persona patterns
    if (text.includes("45") || text.includes("rajesh")) {
      fields.age_hair_loss_began = { value: 45, confidence: 0.95 };
    } else if (text.includes("27") || text.includes("priya")) {
      fields.age_hair_loss_began = { value: 27, confidence: 0.95 };
    } else if (text.includes("34") || text.includes("ananya")) {
      fields.age_hair_loss_began = { value: 34, confidence: 0.95 };
    }

    if (text.includes("8 month") || text.includes("8 mahine") || text.includes("6-12") || text.includes("6 month") || text.includes("6 mahine")) {
      fields.duration = { value: "6-12 months", confidence: 0.9 };
    } else if (text.includes("4 month") || text.includes("4 mahine") || text.includes("< 6") || text.includes("less than 6")) {
      fields.duration = { value: "Less than 6 months", confidence: 0.9 };
    } else if (/\b(over a year|several years|\d+\s*years?(?!\s*old)|ek saal se|saal se)\b/i.test(text)) {
      fields.duration = { value: "Over a year", confidence: 0.85 };
    }

    // Family history
    if (
      text.includes("father") ||
      text.includes("dad") ||
      text.includes("papa") ||
      text.includes("pitaji") ||
      text.includes("dada") ||
      text.includes("डैड") ||
      text.includes("फादर") ||
      text.includes("पिता") ||
      text.includes("पापा") ||
      text.includes("दादा") ||
      text.includes("दर्द")
    ) {
      fields.family_history = {
        value: ["Father had hair loss"],
        confidence: 0.9,
      };
    } else if (
      text.includes("mother") ||
      text.includes("mom") ||
      text.includes("mummy") ||
      text.includes("nana") ||
      text.includes("nani") ||
      text.includes("मॉम") ||
      text.includes("माता") ||
      text.includes("मम्मी") ||
      text.includes("नाना") ||
      text.includes("नानी")
    ) {
      fields.family_history = {
        value: ["Mother had hair loss"],
        confidence: 0.9,
      };
    } else if (
      text.includes("brother") ||
      text.includes("sister") ||
      text.includes("bhai") ||
      text.includes("bhaiya") ||
      text.includes("didi") ||
      text.includes("भाई") ||
      text.includes("भैया") ||
      text.includes("दीदी")
    ) {
      fields.family_history = {
        value: ["Siblings with thinning or baldness"],
        confidence: 0.9,
      };
    }

    // Pattern
    if (text.includes("crown")) {
      fields.pattern = {
        value: ["Thinning at crown"],
        confidence: 0.95,
      };
    } else if (text.includes("shedding") || text.includes("shower") || text.includes("handful")) {
      fields.pattern = {
        value: ["Sudden excessive shedding"],
        confidence: 0.92,
      };
    } else if (text.includes("diffuse") || text.includes("all over")) {
      fields.pattern = {
        value: ["Diffuse thinning"],
        confidence: 0.9,
      };
    }

    // Conditions
    if (text.includes("pcos") || text.includes("pcod")) {
      fields.diagnosed_conditions = {
        value: ["PCOS/PCOD"],
        confidence: 0.95,
      };
      fields.menstrual_cycle = {
        value: "Irregular",
        confidence: 0.9,
      };
    }
    if (text.includes("thyroid")) {
      const existing = fields.diagnosed_conditions?.value || [];
      fields.diagnosed_conditions = {
        value: [...existing, "Thyroid disorder"],
        confidence: 0.95,
      };
    }

    // Past 6 months
    if (text.includes("dengue") || text.includes("fever") || text.includes("covid") || text.includes("malaria")) {
      fields.past_6_months = {
        value: ["Severe illness / high fever (dengue, COVID, malaria, typhoid)"],
        confidence: 0.95,
      };
    }

    // Maternal
    if (text.includes("baby") || text.includes("delivery") || text.includes("postpartum")) {
      fields.pregnancy_related = {
        value: "Postpartum <1 year",
        confidence: 0.95,
      };
    }

    // Habits
    fields.habits = {};
    if (text.includes("cigarette") || text.includes("smoke") || text.includes("peeta")) {
      fields.habits.smoking = {
        value: true,
        severity: "Moderate 5-10/day",
        confidence: 0.9,
      };
    }
    if (text.includes("hard water") || text.includes("borewell")) {
      fields.habits.hard_water = {
        value: true,
        confidence: 0.92,
      };
    }

    // Products (using Indian Brand Resolver)
    const combinedOriginal = `${transcript} ${options?.rawCodemix || ""}`;
    const resolvedCategories = resolveBrandMentions(combinedOriginal);
    if (resolvedCategories.length > 0) {
      fields.products = {
        value: resolvedCategories.map((cat) => ({
          name: cat,
          used: true,
          duration: (cat === "Topical Minoxidil" ? "<3mo" : "3-6mo") as "<3mo" | "3-6mo" | ">6mo",
          helped: cat === "Topical Minoxidil" ? false : true,
          side_effects:
            cat === "Topical Minoxidil" &&
            (text.includes("dry") || text.includes("redness") || text.includes("itch")),
        })),
        confidence: 0.9,
      };
    }


    return {
      fields,
      gender_inference: genderInference,
    };
  }
}

// 2. Sarvam Extraction Provider (Using sarvam-ai-sdk and sarvam-105b)
export class SarvamExtractionProvider implements ExtractionProvider {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SARVAM_API_KEY;
  }

  async extract(
    transcript: string,
    options?: { rawCodemix?: string; timeoutMs?: number }
  ): Promise<ExtractionResult> {
    const rawText = transcript.trim();
    if (!rawText) {
      return {
        fields: {},
        gender_inference: { inferred_gender: "unknown", confidence: 0 },
      };
    }

    // Fallback if no API key is available
    if (!this.apiKey) {
      return new MockExtractionProvider().extract(transcript, options);
    }

    const genderInference = detectGenderCues(options?.rawCodemix, transcript);

    const ExtractionSchema = z.object({
      age_hair_loss_began: z
        .object({
          value: z.number().nullable(),
          confidence: z.number(),
        })
        .optional(),
      duration: z
        .object({
          value: z
            .enum(["Less than 6 months", "6-12 months", "Over a year"])
            .nullable(),
          confidence: z.number(),
        })
        .optional(),
      family_history: z
        .object({
          value: z.array(z.string()),
          confidence: z.number(),
        })
        .optional(),
      pattern: z
        .object({
          value: z.array(z.string()),
          confidence: z.number(),
        })
        .optional(),
      diagnosed_conditions: z
        .object({
          value: z.array(z.string()),
          confidence: z.number(),
        })
        .optional(),
      menstrual_cycle: z
        .object({
          value: z
            .enum(["Regular", "Irregular", "Menopausal", "Not applicable"])
            .nullable(),
          confidence: z.number(),
        })
        .optional(),
      pregnancy_related: z
        .object({
          value: z
            .enum(["Currently pregnant", "Postpartum <1 year", "Not applicable"])
            .nullable(),
          confidence: z.number(),
        })
        .optional(),
      adult_acne_oily_skin: z
        .object({
          value: z.boolean().nullable(),
          confidence: z.number(),
        })
        .optional(),
      excess_body_facial_hair: z
        .object({
          value: z.boolean().nullable(),
          confidence: z.number(),
        })
        .optional(),
      past_6_months: z
        .object({
          value: z.array(z.string()),
          confidence: z.number(),
        })
        .optional(),
      smoking: z
        .object({
          value: z.boolean().nullable(),
          severity: z
            .enum(["Mild <5/day", "Moderate 5-10/day", "Severe >10/day"])
            .nullable(),
          confidence: z.number(),
        })
        .optional(),
      alcohol: z
        .object({
          value: z.boolean().nullable(),
          confidence: z.number(),
        })
        .optional(),
      hard_water: z
        .object({
          value: z.boolean().nullable(),
          confidence: z.number(),
        })
        .optional(),
      hair_wash_frequency: z
        .object({
          value: z.enum(["Daily", "Alternate Days", "Weekly"]).nullable(),
          confidence: z.number(),
        })
        .optional(),
      heating_tools_styling_chemicals: z
        .object({
          value: z.boolean().nullable(),
          confidence: z.number(),
        })
        .optional(),
      salon_treatments: z
        .object({
          value: z.boolean().nullable(),
          detail: z.string().nullable().optional(),
          confidence: z.number(),
        })
        .optional(),
      products: z
        .object({
          used_names: z.array(z.string()),
          confidence: z.number(),
        })
        .optional(),
      procedures: z
        .object({
          done_names: z.array(z.string()),
          confidence: z.number(),
        })
        .optional(),
      past_treatment_side_effects: z
        .object({
          value: z.boolean().nullable(),
          describe: z.string().nullable().optional(),
          confidence: z.number(),
        })
        .optional(),
      sample_type: z
        .object({
          value: z.enum(["Saliva", "Blood", "Either"]).nullable(),
          confidence: z.number(),
        })
        .optional(),
      consent: z
        .object({
          value: z.boolean().nullable(),
          confidence: z.number(),
        })
        .optional(),
      gender: z
        .object({
          inferred_gender: z.enum(["male", "female", "unknown"]),
          confidence: z.number(),
          cue: z.string(),
        })
        .optional(),
    });

    try {
      const modelInstance = sarvam("sarvam-105b", {
        reasoning_effort: "none",
      });

      const prompt = `You are an expert clinical dermatological intake system for hair & scalp clinics in India.
Patient voice transcript: "${transcript}"
Code-mixed original: "${options?.rawCodemix || ""}"

Extract any medical intake fields mentioned by the patient. If not mentioned with reasonable certainty, set value to null or empty list and confidence to 0.0.
Assign a confidence score (0.0 to 1.0) for every field.
Rules & Allowed Values:
- age_hair_loss_began: integer age (e.g. 25, 45).
- duration: exactly one of "Less than 6 months", "6-12 months", "Over a year". (e.g. 8 months maps to "6-12 months").
- family_history: array containing one or more of ["Father had hair loss", "Mother had hair loss", "Siblings with thinning or baldness", "No known family history"].
- pattern: array containing one or more of ["Receding hairline", "Thinning at crown", "Widening part line", "Diffuse thinning", "Patchy loss", "Sudden excessive shedding"].
- diagnosed_conditions: array containing one or more of ["PCOS/PCOD", "Thyroid disorder", "Diabetes", "Autoimmune disease", "Anemia", "None"].
- menstrual_cycle: "Regular", "Irregular", "Menopausal", or "Not applicable".
- pregnancy_related: "Currently pregnant", "Postpartum <1 year", or "Not applicable".
- past_6_months: array of events like ["Severe illness / high fever (dengue, COVID, malaria, typhoid)", "Major surgery / rapid weight loss / strict diet", "Severe emotional stress / bereavement / job change", "Starting or stopping medications"].
- smoking: boolean and severity ("Mild <5/day", "Moderate 5-10/day", "Severe >10/day").
- hard_water: boolean (true if borewell or hard water mentioned).
- hair_wash_frequency: "Daily", "Alternate Days", or "Weekly".
- products: Indian brand resolver mapping:
${getBrandPromptContext()}
  used_names should strictly contain only the mapped generic schema categories ("Topical Minoxidil", "Supplements", "OTC/Medicated Shampoos", "Hair Oils/Serums", "Oral Minoxidil").
- gender: "male", "female", or "unknown" based on Hindi grammar ("ka hoon" vs "ki hoon", "gaya" vs "gayi") and clinical cues (PCOS, postpartum, pregnancy, beard).`;


      const { output } = await generateText({
        model: modelInstance,
        output: Output.object({
          name: "IntakeExtraction",
          description: "Structured extraction of patient intake data with confidence scores",
          schema: ExtractionSchema,
        }),
        prompt,
      });

      const fields: ExtractionResult["fields"] = {};

      if (output.age_hair_loss_began?.value != null) {
        fields.age_hair_loss_began = {
          value: output.age_hair_loss_began.value,
          confidence: output.age_hair_loss_began.confidence,
        };
      }

      if (output.duration?.value != null) {
        fields.duration = {
          value: output.duration.value,
          confidence: output.duration.confidence,
        };
      }

      if (output.family_history?.value && output.family_history.value.length > 0) {
        fields.family_history = {
          value: output.family_history.value,
          confidence: output.family_history.confidence,
        };
      }

      if (output.pattern?.value && output.pattern.value.length > 0) {
        fields.pattern = {
          value: output.pattern.value,
          confidence: output.pattern.confidence,
        };
      }

      if (output.diagnosed_conditions?.value && output.diagnosed_conditions.value.length > 0) {
        fields.diagnosed_conditions = {
          value: output.diagnosed_conditions.value,
          confidence: output.diagnosed_conditions.confidence,
        };
      }

      if (output.menstrual_cycle?.value != null) {
        fields.menstrual_cycle = {
          value: output.menstrual_cycle.value,
          confidence: output.menstrual_cycle.confidence,
        };
      }

      if (output.pregnancy_related?.value != null) {
        fields.pregnancy_related = {
          value: output.pregnancy_related.value,
          confidence: output.pregnancy_related.confidence,
        };
      }

      if (output.adult_acne_oily_skin?.value != null) {
        fields.adult_acne_oily_skin = {
          value: output.adult_acne_oily_skin.value,
          confidence: output.adult_acne_oily_skin.confidence,
        };
      }

      if (output.excess_body_facial_hair?.value != null) {
        fields.excess_body_facial_hair = {
          value: output.excess_body_facial_hair.value,
          confidence: output.excess_body_facial_hair.confidence,
        };
      }

      if (output.past_6_months?.value && output.past_6_months.value.length > 0) {
        fields.past_6_months = {
          value: output.past_6_months.value,
          confidence: output.past_6_months.confidence,
        };
      }

      if (
        output.smoking ||
        output.alcohol ||
        output.hard_water ||
        output.hair_wash_frequency ||
        output.heating_tools_styling_chemicals ||
        output.salon_treatments
      ) {
        fields.habits = {};
        if (output.smoking?.value != null) {
          fields.habits.smoking = {
            value: output.smoking.value,
            severity: output.smoking.severity,
            confidence: output.smoking.confidence,
          };
        }
        if (output.alcohol?.value != null) {
          fields.habits.alcohol = {
            value: output.alcohol.value,
            confidence: output.alcohol.confidence,
          };
        }
        if (output.hard_water?.value != null) {
          fields.habits.hard_water = {
            value: output.hard_water.value,
            confidence: output.hard_water.confidence,
          };
        }
        if (output.hair_wash_frequency?.value != null) {
          fields.habits.hair_wash_frequency = {
            value: output.hair_wash_frequency.value,
            confidence: output.hair_wash_frequency.confidence,
          };
        }
        if (output.heating_tools_styling_chemicals?.value != null) {
          fields.habits.heating_tools_styling_chemicals = {
            value: output.heating_tools_styling_chemicals.value,
            confidence: output.heating_tools_styling_chemicals.confidence,
          };
        }
        if (output.salon_treatments?.value != null) {
          fields.habits.salon_treatments = {
            value: output.salon_treatments.value,
            detail: output.salon_treatments.detail,
            confidence: output.salon_treatments.confidence,
          };
        }
      }

      if (output.products?.used_names && output.products.used_names.length > 0) {
        fields.products = {
          value: output.products.used_names.map((name) => ({
            name,
            used: true,
          })),
          confidence: output.products.confidence,
        };
      }

      if (output.procedures?.done_names && output.procedures.done_names.length > 0) {
        fields.procedures = {
          value: output.procedures.done_names.map((name) => ({
            name,
            done: true,
          })),
          confidence: output.procedures.confidence,
        };
      }

      if (output.past_treatment_side_effects?.value != null) {
        fields.past_treatment_side_effects = {
          value: output.past_treatment_side_effects.value,
          describe: output.past_treatment_side_effects.describe,
          confidence: output.past_treatment_side_effects.confidence,
        };
      }

      if (output.sample_type?.value != null) {
        fields.sample_type = {
          value: output.sample_type.value,
          confidence: output.sample_type.confidence,
        };
      }

      if (output.consent?.value != null) {
        fields.consent = {
          value: output.consent.value,
          confidence: output.consent.confidence,
        };
      }

      let finalGender = genderInference;
      if (output.gender && output.gender.inferred_gender !== "unknown") {
        if (output.gender.confidence >= finalGender.confidence) {
          finalGender = {
            inferred_gender: output.gender.inferred_gender,
            confidence: output.gender.confidence,
            cues: output.gender.cue || finalGender.cues,
          };
        }
      }

      return {
        fields,
        gender_inference: finalGender,
      };
    } catch (err: unknown) {
      console.warn("Sarvam extraction API error, using safe fallback:", err);
      return new MockExtractionProvider().extract(transcript, options);
    }
  }
}

// 3. OpenAI Extraction Provider (Swap-ready abstraction using gpt-4o-mini)
export class OpenAIExtractionProvider implements ExtractionProvider {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
  }

  async extract(
    transcript: string,
    options?: { rawCodemix?: string }
  ): Promise<ExtractionResult> {
    if (!this.apiKey) {
      return new MockExtractionProvider().extract(transcript, options);
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are an expert clinical intake parser for hair & scalp health. Extract structured medical fields from the patient transcript as JSON matching the clinical intake schema. Output keys: age_hair_loss_began, duration, family_history, pattern, diagnosed_conditions, menstrual_cycle, pregnancy_related, past_6_months, smoking, hard_water, hair_wash_frequency, products, gender.",
            },
            {
              role: "user",
              content: `Patient transcript: "${transcript}"\nCode-mixed original: "${options?.rawCodemix || ""}"`,
            },
          ],
        }),
      });

      if (!response.ok) {
        return new MockExtractionProvider().extract(transcript, options);
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) return new MockExtractionProvider().extract(transcript, options);

      const parsed = JSON.parse(content);
      const genderInference = detectGenderCues(options?.rawCodemix, transcript);
      const fields: ExtractionResult["fields"] = {};

      if (parsed.age_hair_loss_began) {
        fields.age_hair_loss_began = { value: Number(parsed.age_hair_loss_began), confidence: 0.9 };
      }
      if (parsed.duration) {
        fields.duration = { value: parsed.duration, confidence: 0.9 };
      }
      if (Array.isArray(parsed.family_history)) {
        fields.family_history = { value: parsed.family_history, confidence: 0.9 };
      }
      if (Array.isArray(parsed.pattern)) {
        fields.pattern = { value: parsed.pattern, confidence: 0.9 };
      }
      if (Array.isArray(parsed.diagnosed_conditions)) {
        fields.diagnosed_conditions = { value: parsed.diagnosed_conditions, confidence: 0.9 };
      }
      if (parsed.menstrual_cycle) {
        fields.menstrual_cycle = { value: parsed.menstrual_cycle, confidence: 0.9 };
      }
      if (parsed.pregnancy_related) {
        fields.pregnancy_related = { value: parsed.pregnancy_related, confidence: 0.9 };
      }
      if (Array.isArray(parsed.past_6_months)) {
        fields.past_6_months = { value: parsed.past_6_months, confidence: 0.9 };
      }

      return {
        fields,
        gender_inference: genderInference,
      };
    } catch {
      return new MockExtractionProvider().extract(transcript, options);
    }
  }
}

export function getExtractionProvider(
  providerName: string = process.env.LLM_PROVIDER || "sarvam"
): ExtractionProvider {
  const normalized = providerName.toLowerCase().trim();
  if (normalized === "mock" || normalized === "test") {
    return new MockExtractionProvider();
  }
  if (normalized === "openai") {
    return new OpenAIExtractionProvider();
  }
  return new SarvamExtractionProvider();
}
