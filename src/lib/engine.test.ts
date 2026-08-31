import { describe, expect, it } from "bun:test";
import {
  createInitialEngineState,
  startStepByStep,
  answerCurrentQuestion,
  formatUserAnswer,
  resetEngineState,
  getCurrentQuestion,
  formatFullSchemaJson,
  editQuestion,
} from "./engine";
import { ALL_QUESTIONS } from "@/data/questions";

describe("Chat Flow Engine - All 16 Questions", () => {
  it("initializes in welcome phase with initial welcome bot message", () => {
    const state = createInitialEngineState();
    expect(state.phase).toBe("welcome");
    expect(state.currentStepId).toBeNull();
    expect(state.messages.length).toBe(1);
    expect(state.messages[0].sender).toBe("bot");
    expect(state.messages[0].content).toContain("I'm here to help your doctor");
    expect(state.answeredQuestionIds).toEqual([]);
    expect(Object.keys(state.formData).length).toBe(0);
  });

  it("starts step-by-step flow and loads Q1", () => {
    let state = createInitialEngineState();
    state = startStepByStep(state);

    expect(state.phase).toBe("in_progress");
    expect(state.currentStepId).toBe("q1");
    const currentQ = getCurrentQuestion(state);
    expect(currentQ?.id).toBe("q1");
    expect(currentQ?.type).toBe("number");
    expect(state.messages.length).toBe(2);
    expect(state.messages[1].questionId).toBe("q1");
  });

  it("handles Section A: Q1 through Q4 and transitions to Section B with empathetic message", () => {
    let state = createInitialEngineState();
    state = startStepByStep(state);
    state = answerCurrentQuestion(state, 24); // Q1
    state = answerCurrentQuestion(state, "6-12 months"); // Q2
    state = answerCurrentQuestion(state, ["Father had hair loss"]); // Q3
    state = answerCurrentQuestion(state, ["Thinning at crown", "Receding hairline"]); // Q4

    expect(state.formData.age_hair_loss_began).toBe(24);
    expect(state.formData.duration).toBe("6-12 months");
    expect(state.formData.family_history).toEqual(["Father had hair loss"]);
    expect(state.formData.pattern).toEqual(["Thinning at crown", "Receding hairline"]);

    // Advances to Section B Q5
    expect(state.currentStepId).toBe("q5");
    const currentQ = getCurrentQuestion(state);
    expect(currentQ?.id).toBe("q5");

    // Check transition message exists
    const transMsg = state.messages.find((m) => m.isTransition && m.content.includes("Personal history recorded"));
    expect(transMsg).toBeDefined();
  });

  it("handles Section B: Q5, unified hormonal Q6/Q7, and combined skin/body markers Q8/Q9", () => {
    let state = createInitialEngineState();
    state = startStepByStep(state);
    // Section A
    state = answerCurrentQuestion(state, 28);
    state = answerCurrentQuestion(state, "Over a year");
    state = answerCurrentQuestion(state, ["Mother had hair loss"]);
    state = answerCurrentQuestion(state, ["Widening part line"]);

    // Section B
    state = answerCurrentQuestion(state, ["PCOS/PCOD", "Anemia"]); // Q5
    expect(state.formData.diagnosed_conditions).toEqual(["PCOS/PCOD", "Anemia"]);
    expect(state.currentStepId).toBe("q6_q7_hormonal");

    // Unified hormonal card
    state = answerCurrentQuestion(state, "Irregular"); // Q6/Q7
    expect(state.formData.menstrual_cycle).toBe("Irregular");
    expect(state.formData.pregnancy_related).toBe("Not applicable");
    expect(state.currentStepId).toBe("q8_q9_skin");

    // Q8/Q9 skin and body markers
    state = answerCurrentQuestion(state, {
      adult_acne_oily_skin: true,
      excess_body_facial_hair: true,
    });
    expect(state.formData.adult_acne_oily_skin).toBe(true);
    expect(state.formData.excess_body_facial_hair).toBe(true);

    // Advances to Section C smoking
    expect(state.currentStepId).toBe("q11_smoking");
  });

  it("handles unified hormonal option: Postpartum <1 year correctly", () => {
    let state = createInitialEngineState();
    state = startStepByStep(state);
    // Jump to q6_q7_hormonal by setting step
    state.currentStepId = "q6_q7_hormonal";
    state = answerCurrentQuestion(state, "Postpartum <1 year");

    expect(state.formData.menstrual_cycle).toBe("Not applicable");
    expect(state.formData.pregnancy_related).toBe("Postpartum <1 year");
  });

  it("handles Section C: Health habits and Hair care routine with salon detail follow-up and Q10", () => {
    let state = createInitialEngineState();
    state = startStepByStep(state);
    state.currentStepId = "q11_smoking";

    // Smoking with severity
    state = answerCurrentQuestion(state, "Mild <5/day");
    expect(state.formData.habits?.smoking).toBe(true);
    expect(state.formData.habits?.smoking_severity).toBe("Mild <5/day");
    expect(state.currentStepId).toBe("q11_alcohol");

    // Alcohol
    state = answerCurrentQuestion(state, "true");
    expect(state.formData.habits?.alcohol).toBe(true);
    expect(state.currentStepId).toBe("q11_hard_water");

    // Hard water
    state = answerCurrentQuestion(state, "true");
    expect(state.formData.habits?.hard_water).toBe(true);
    expect(state.currentStepId).toBe("q11_hair_wash_frequency");

    // Wash frequency
    state = answerCurrentQuestion(state, "Daily");
    expect(state.formData.habits?.hair_wash_frequency).toBe("Daily");
    expect(state.currentStepId).toBe("q11_heating_tools");

    // Heating tools
    state = answerCurrentQuestion(state, "false");
    expect(state.formData.habits?.heating_tools_styling_chemicals).toBe(false);
    expect(state.currentStepId).toBe("q11_salon_treatments");

    // Salon treatments = Yes -> triggers follow-up
    state = answerCurrentQuestion(state, "true");
    expect(state.formData.habits?.salon_treatments).toBe(true);
    expect(state.currentStepId).toBe("q11_salon_detail");

    // Salon detail
    state = answerCurrentQuestion(state, "Keratin smoothing 3 months ago");
    expect(state.formData.habits?.salon_treatment_detail).toBe("Keratin smoothing 3 months ago");
    expect(state.currentStepId).toBe("q10_past_6_months");

    // Q10 past 6 months
    state = answerCurrentQuestion(state, ["High stress or emotional trauma", "Fever with illness (COVID, Dengue, Typhoid)"]);
    expect(state.formData.past_6_months).toEqual([
      "High stress or emotional trauma",
      "Fever with illness (COVID, Dengue, Typhoid)",
    ]);
    expect(state.currentStepId).toBe("q12_products_select");
  });

  it("handles Section D: Product follow-up cascade, procedure follow-ups, and side effects", () => {
    let state = createInitialEngineState();
    state = startStepByStep(state);
    state.currentStepId = "q12_products_select";

    // Select 2 products: Topical Minoxidil and Supplements
    state = answerCurrentQuestion(state, ["Topical Minoxidil", "Supplements"]);

    // Topical Minoxidil follow-ups
    expect(state.currentStepId).toBe("q12_prod_topical_minoxidil_duration");
    state = answerCurrentQuestion(state, "3-6mo");
    expect(state.currentStepId).toBe("q12_prod_topical_minoxidil_helped");
    state = answerCurrentQuestion(state, "true");
    expect(state.currentStepId).toBe("q12_prod_topical_minoxidil_side_effects");
    state = answerCurrentQuestion(state, "false");

    // Supplements follow-ups
    expect(state.currentStepId).toBe("q12_prod_supplements_duration");
    state = answerCurrentQuestion(state, ">6mo");
    expect(state.currentStepId).toBe("q12_prod_supplements_helped");
    state = answerCurrentQuestion(state, "true");
    expect(state.currentStepId).toBe("q12_prod_supplements_side_effects");
    state = answerCurrentQuestion(state, "false");

    // Verify products data structure
    const minox = state.formData.products?.find((p) => p.name === "Topical Minoxidil");
    expect(minox?.used).toBe(true);
    expect(minox?.duration).toBe("3-6mo");
    expect(minox?.helped).toBe(true);
    expect(minox?.side_effects).toBe(false);

    const supp = state.formData.products?.find((p) => p.name === "Supplements");
    expect(supp?.used).toBe(true);
    expect(supp?.duration).toBe(">6mo");

    // Procedures Gate: Yes -> Multi-select procedures
    expect(state.currentStepId).toBe("q13_procedures_gate");
    state = answerCurrentQuestion(state, "true");
    expect(state.currentStepId).toBe("q13_procedures_select");

    // Select PRP
    state = answerCurrentQuestion(state, ["PRP/GFC/iPRF"]);
    expect(state.currentStepId).toBe("q13_proc_prp_gfc_iprf_sessions");
    state = answerCurrentQuestion(state, "4-6");
    expect(state.currentStepId).toBe("q13_proc_prp_gfc_iprf_helped");
    state = answerCurrentQuestion(state, "true");

    const prp = state.formData.procedures?.find((p) => p.name === "PRP/GFC/iPRF");
    expect(prp?.done).toBe(true);
    expect(prp?.sessions).toBe("4-6");
    expect(prp?.helped).toBe(true);

    // Q14 side effects gate: Yes -> text describe
    expect(state.currentStepId).toBe("q14_side_effects_gate");
    state = answerCurrentQuestion(state, "true");
    expect(state.currentStepId).toBe("q14_side_effects_describe");
    state = answerCurrentQuestion(state, "Mild scalp flaking during week 2");

    expect(state.formData.past_treatment_side_effects).toBe(true);
    expect(state.formData.past_treatment_side_effects_describe).toBe("Mild scalp flaking during week 2");
    expect(state.currentStepId).toBe("q15_sample_type");
  });

  it("handles Section E and transitions to review phase", () => {
    let state = createInitialEngineState();
    state = startStepByStep(state);
    state.currentStepId = "q15_sample_type";

    state = answerCurrentQuestion(state, "Saliva");
    expect(state.formData.sample_type).toBe("Saliva");
    expect(state.currentStepId).toBe("q16_consent");

    state = answerCurrentQuestion(state, "true");
    expect(state.formData.consent).toBe(true);
    expect(state.phase).toBe("review");
    expect(state.currentStepId).toBeNull();
  });

  it("handles fast-path: Patient selecting 'None' for everything skips all sub-steps in minimal taps", () => {
    let state = createInitialEngineState();
    state = startStepByStep(state);

    // Q1-Q4
    state = answerCurrentQuestion(state, 30);
    state = answerCurrentQuestion(state, "Less than 6 months");
    state = answerCurrentQuestion(state, ["No known family history"]);
    state = answerCurrentQuestion(state, ["Diffuse thinning"]);

    // Q5-Q9
    state = answerCurrentQuestion(state, ["None"]);
    state = answerCurrentQuestion(state, "Not applicable");
    state = answerCurrentQuestion(state, { adult_acne_oily_skin: false, excess_body_facial_hair: false });

    // Q11 Habits (No smoking, No alcohol, Normal water, Alternate Days, No heating, No salon)
    state = answerCurrentQuestion(state, "No");
    state = answerCurrentQuestion(state, "false");
    state = answerCurrentQuestion(state, "false");
    state = answerCurrentQuestion(state, "Alternate Days");
    state = answerCurrentQuestion(state, "false");
    state = answerCurrentQuestion(state, "false"); // No salon -> skips salon detail directly to Q10!
    expect(state.currentStepId).toBe("q10_past_6_months");

    state = answerCurrentQuestion(state, ["None of these"]);

    // Section D (None for products -> skips to Q13; No for procedures -> skips to Q14; No for side effects -> skips to Q15!)
    expect(state.currentStepId).toBe("q12_products_select");
    state = answerCurrentQuestion(state, ["None"]);
    expect(state.currentStepId).toBe("q13_procedures_gate");
    state = answerCurrentQuestion(state, "false");
    expect(state.currentStepId).toBe("q14_side_effects_gate");
    state = answerCurrentQuestion(state, "false");
    expect(state.currentStepId).toBe("q15_sample_type");

    // Section E
    state = answerCurrentQuestion(state, "Either");
    state = answerCurrentQuestion(state, "true");

    expect(state.phase).toBe("review");

    // Verify full schema output has every single required key populated
    const schemaOutput = formatFullSchemaJson(state.formData);
    expect(schemaOutput.form).toBe("GenoRoot Hair & Scalp Intake");
    expect(schemaOutput.intake_data.age_hair_loss_began).toBe(30);
    expect(schemaOutput.intake_data.duration).toBe("Less than 6 months");
    expect(schemaOutput.intake_data.menstrual_cycle).toBe("Not applicable");
    expect(schemaOutput.intake_data.pregnancy_related).toBe("Not applicable");
    expect(schemaOutput.intake_data.products.length).toBe(5);
    expect(schemaOutput.intake_data.products.every((p) => p.used === false)).toBe(true);
    expect(schemaOutput.intake_data.procedures.length).toBe(4);
    expect(schemaOutput.intake_data.procedures.every((p) => p.done === false)).toBe(true);
    expect(schemaOutput.intake_data.consent).toBe(true);
  });

  it("supports editing a field from review phase and returning to review", () => {
    let state = createInitialEngineState();
    state = startStepByStep(state);
    state.phase = "review";
    state.formData = {
      age_hair_loss_began: 25,
      duration: "6-12 months",
    };

    // User taps edit on Q1
    state = editQuestion(state, "q1");
    expect(state.phase).toBe("in_progress");
    expect(state.editingStepId).toBe("q1");
    expect(state.currentStepId).toBe("q1");

    // User updates age to 29
    state = answerCurrentQuestion(state, 29);
    expect(state.formData.age_hair_loss_began).toBe(29);
    expect(state.phase).toBe("review");
    expect(state.editingStepId).toBeNull();
    expect(state.currentStepId).toBeNull();
  });
});

