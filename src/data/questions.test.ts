import { describe, expect, it } from "bun:test";
import { ALL_QUESTIONS, WELCOME_MESSAGE } from "./questions";
import { getCurrentQuestion, getMicroAffirmation, createInitialEngineState } from "@/lib/engine";

describe("Plain-Language Clinical Framing for ALL_QUESTIONS & Dynamic Engine Copy", () => {
  const forbiddenPhrases = [
    "follicular DHT sensitivity",
    "Hamilton-Norwood",
    "Ludwig",
    "5-alpha reductase",
    "micro-capillaries",
    "anagen prolongation",
    "bubble hair",
    "disulfide bonds",
    "autologous growth factors",
    "telogen effluvium",
    "vasoconstriction",
    "systemic health conditions directly alter follicular nutrient supply",
    "sebum secretion and peripheral androgen sensitivity",
    "follicular miniaturization",
    "reversible telogen triggers",
    "micro-capillary circulation",
  ];

  it("does not contain biochemical textbook jargon in prompts, helper texts, or option descriptions", () => {
    for (const q of ALL_QUESTIONS) {
      const textToScan = `${q.prompt} ${q.helperText ?? ""} ${q.options?.map((o) => `${o.label} ${o.description ?? ""}`).join(" ") ?? ""}`.toLowerCase();

      for (const phrase of forbiddenPhrases) {
        const found = textToScan.includes(phrase.toLowerCase());
        if (found) {
          throw new Error(`Question ${q.id} (${q.key}) contains forbidden technical jargon: "${phrase}"`);
        }
      }
    }
  });

  it("uses consistent 'your doctor' phrasing instead of hardcoding specific doctor names", () => {
    for (const q of ALL_QUESTIONS) {
      const textToScan = `${q.prompt} ${q.helperText ?? ""} ${q.options?.map((o) => `${o.label} ${o.description ?? ""}`).join(" ") ?? ""}`;
      expect(textToScan).not.toContain("Dr. Sharma");
    }
  });

  it("does not contain forbidden jargon in dynamic engine questions or helper texts", () => {
    // Test dynamic product follow-up
    const prodDyn = getCurrentQuestion({
      ...createInitialEngineState(),
      phase: "in_progress",
      currentStepId: "q12_prod_topical-minoxidil_duration",
    });
    expect(prodDyn).not.toBeNull();
    const prodText = `${prodDyn!.prompt} ${prodDyn!.helperText ?? ""}`.toLowerCase();
    for (const phrase of forbiddenPhrases) {
      expect(prodText).not.toContain(phrase.toLowerCase());
    }
    expect(prodDyn!.helperText).toContain("Why we ask");

    // Test dynamic procedure follow-up
    const procDyn = getCurrentQuestion({
      ...createInitialEngineState(),
      phase: "in_progress",
      currentStepId: "q13_proc_prp-gfc-iprf_helped",
    });
    expect(procDyn).not.toBeNull();
    const procText = `${procDyn!.prompt} ${procDyn!.helperText ?? ""}`.toLowerCase();
    for (const phrase of forbiddenPhrases) {
      expect(procText).not.toContain(phrase.toLowerCase());
    }
  });

  it("does not contain forbidden jargon in micro-affirmations", () => {
    const questionKeys = [
      "q1",
      "q_biological_sex",
      "q2",
      "q3",
      "q4",
      "q5",
      "q6_q7_hormonal",
      "q8_q9_skin",
      "q11_smoking",
      "q11_hard_water",
      "q11_hair_wash_frequency",
      "q10_past_6_months",
      "q12_products_select",
      "q13_procedures_gate",
      "q14_side_effects_gate",
      "q15_sample_type",
    ];

    const roboticPhrases = ["recorded", "logged", "question"];

    for (const key of questionKeys) {
      const affDefault = getMicroAffirmation(key, "dummy answer")?.toLowerCase() ?? "";
      const affMale = getMicroAffirmation(key, "male")?.toLowerCase() ?? "";
      const affFemale = getMicroAffirmation(key, "female")?.toLowerCase() ?? "";

      for (const affirmation of [affDefault, affMale, affFemale]) {
        for (const phrase of forbiddenPhrases) {
          expect(affirmation).not.toContain(phrase.toLowerCase());
        }
        for (const word of roboticPhrases) {
          expect(affirmation).not.toContain(word);
        }
      }
    }
  });

  it("does not use the word 'question' in biological sex prompts or options", () => {
    const sexQ = ALL_QUESTIONS.find((q) => q.id === "q_biological_sex")!;
    const text = `${sexQ.prompt} ${sexQ.helperText ?? ""} ${sexQ.options?.map((o) => `${o.label} ${o.description ?? ""}`).join(" ")}`.toLowerCase();
    expect(text).not.toContain("question");
  });

  it("contains empathetic 'Why we ask:' helper text for questions with helpers", () => {
    for (const q of ALL_QUESTIONS) {
      if (q.helperText) {
        expect(q.helperText.toLowerCase()).toContain("why we ask");
      }
    }
  });

  it("preserves exact schema option values for backward and cross-service compatibility", () => {
    const q12 = ALL_QUESTIONS.find((q) => q.id === "q12_products_select");
    expect(q12).toBeDefined();
    const q12Values = q12!.options?.map((o) => o.value);
    expect(q12Values).toContain("Topical Minoxidil");
    expect(q12Values).toContain("Oral Minoxidil");
    expect(q12Values).toContain("Supplements");
    expect(q12Values).toContain("None");

    const q3 = ALL_QUESTIONS.find((q) => q.id === "q3");
    expect(q3).toBeDefined();
    const q3Values = q3!.options?.map((o) => o.value);
    expect(q3Values).toContain("Father had hair loss");
    expect(q3Values).toContain("Mother had hair loss");
    expect(q3Values).toContain("Siblings with thinning or baldness");
    expect(q3Values).toContain("No known family history");
  });

  it("does not contain emojis in questions, welcome message, or autofill copy", () => {
    const emojiRegex = /[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/u;

    for (const q of ALL_QUESTIONS) {
      expect(emojiRegex.test(q.prompt)).toBe(false);
      if (q.helperText) expect(emojiRegex.test(q.helperText)).toBe(false);
      q.options?.forEach((o) => {
        expect(emojiRegex.test(o.label)).toBe(false);
        if (o.description) expect(emojiRegex.test(o.description)).toBe(false);
      });
    }

    expect(emojiRegex.test(WELCOME_MESSAGE.text)).toBe(false);
    WELCOME_MESSAGE.buttons.forEach((b) => {
      expect(emojiRegex.test(b.label)).toBe(false);
    });
  });
});
