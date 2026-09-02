import { describe, expect, it } from "bun:test";
import {
  createInitialEngineState,
  startStepByStep,
  answerCurrentQuestion,
  getCurrentQuestion,
  formatFullSchemaJson,
  editQuestion,
  answerWithVoice,
  applyVoiceCascade,
  confirmCascade,
  confirmGenderInference,
  updateCascadeField,
} from "./engine";
import { CascadeFieldItem } from "@/types/schema";

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
    state = answerCurrentQuestion(state, "female"); // q_biological_sex
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
    const transMsg = state.messages.find((m) => m.isTransition && m.content.includes("health and hormonal factors"));
    expect(transMsg).toBeDefined();
  });

  it("handles Section B: Q5, unified hormonal Q6/Q7, and combined skin/body markers Q8/Q9", () => {
    let state = createInitialEngineState();
    state = startStepByStep(state);
    // Section A
    state = answerCurrentQuestion(state, 28);
    state = answerCurrentQuestion(state, "female"); // q_biological_sex
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

  it("omits Q6/Q7 hormonal questions completely when biological sex is male", () => {
    let state = createInitialEngineState();
    state = startStepByStep(state);
    state = answerCurrentQuestion(state, 32); // Q1
    state = answerCurrentQuestion(state, "male"); // q_biological_sex
    state = answerCurrentQuestion(state, "Over a year"); // Q2
    state = answerCurrentQuestion(state, ["Father had hair loss"]); // Q3
    state = answerCurrentQuestion(state, ["Thinning at crown"]); // Q4
    state = answerCurrentQuestion(state, ["Diabetes"]); // Q5

    // Male path routes directly to q8_q9_skin, bypassing q6_q7_hormonal!
    expect(state.currentStepId).toBe("q8_q9_skin");
    expect(state.formData.menstrual_cycle).toBe("Not applicable");
    expect(state.formData.pregnancy_related).toBe("Not applicable");
    expect(state.answeredQuestionIds).toContain("q6_q7_hormonal");
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
    state = answerCurrentQuestion(state, "male"); // q_biological_sex
    state = answerCurrentQuestion(state, "Less than 6 months");
    state = answerCurrentQuestion(state, ["No known family history"]);
    state = answerCurrentQuestion(state, ["Diffuse thinning"]);

    // Q5-Q9 (Male skips Q6/Q7 automatically to Q8/Q9)
    state = answerCurrentQuestion(state, ["None"]);
    expect(state.currentStepId).toBe("q8_q9_skin");
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

  describe("answerWithVoice seam", () => {
    it("auto-fills Q1 age from voice and advances to Q2 with voice bubble metadata", () => {
      let state = createInitialEngineState();
      state = startStepByStep(state);
      expect(state.currentStepId).toBe("q1");

      state = answerWithVoice(state, {
        audioUrl: "blob:http://localhost:3000/audio-123",
        durationSeconds: 3,
        codemix: "meri age lagbhag 26 saal hai",
        translate: "my age is approximately 26 years old",
      });

      // Age filled
      expect(state.formData.age_hair_loss_began).toBe(26);
      // Advances to q_biological_sex
      expect(state.currentStepId).toBe("q_biological_sex");
      // Contains user voice message
      const voiceMsg = state.messages.find((m) => m.sender === "user" && m.voice?.durationSeconds === 3);
      expect(voiceMsg).toBeDefined();
      expect(voiceMsg?.voice?.codemixTranscript).toBe("meri age lagbhag 26 saal hai");
      expect(voiceMsg?.voice?.translateTranscript).toBe("my age is approximately 26 years old");
      expect(voiceMsg?.voice?.audioUrl).toBe("blob:http://localhost:3000/audio-123");
    });

    it("handles ambiguous or unparseable voice by showing transcript and staying on question with guidance", () => {
      let state = createInitialEngineState();
      state = startStepByStep(state);
      expect(state.currentStepId).toBe("q1");

      state = answerWithVoice(state, {
        audioUrl: "blob:http://localhost:3000/audio-456",
        durationSeconds: 2,
        codemix: "kuch mahine pehle se",
        translate: "since a few months ago",
      });

      // Q1 requires an age number; "since a few months ago" does not give an age
      expect(state.formData.age_hair_loss_began).toBeUndefined();
      // Remains on Q1
      expect(state.currentStepId).toBe("q1");
      // User message added
      const userMsg = state.messages.find((m) => m.content === "kuch mahine pehle se");
      expect(userMsg).toBeDefined();
      // Bot guidance message added
      const botMsg = state.messages[state.messages.length - 1];
      expect(botMsg.sender).toBe("bot");
      expect(botMsg.content).toContain("kuch mahine pehle se");
      expect(botMsg.content).toContain("please enter or select");
    });

    it("auto-fills free text questions (Q11 salon detail) with voice note", () => {
      let state = createInitialEngineState();
      state = startStepByStep(state);
      // Simulate state at q11_salon_detail
      state.currentStepId = "q11_salon_detail";
      state.formData = {
        ...state.formData,
        habits: {
          smoking: false,
          alcohol: false,
          hard_water: false,
          hair_wash_frequency: "Daily",
          heating_tools_styling_chemicals: false,
          salon_treatments: true,
        },
      };

      state = answerWithVoice(state, {
        durationSeconds: 4,
        codemix: "chaar mahine pehle keratin smoothing karwayi thi",
        translate: "had keratin smoothing done 4 months ago",
      });

      expect(state.formData.habits?.salon_treatment_detail).toBe("had keratin smoothing done 4 months ago");
      expect(state.currentStepId).toBe("q10_past_6_months");
    });
  });

  describe("Voice Cascade Seam", () => {
    it("handles empty or zero-field voice note by falling back gracefully to step-by-step from Q1", () => {
      let state = createInitialEngineState();
      state = applyVoiceCascade(state, {
        fields: [],
        voice: {
          codemixTranscript: "hello doctor",
          translateTranscript: "hello doctor",
          durationSeconds: 3,
        },
      });

      expect(state.phase).toBe("in_progress");
      expect(state.currentStepId).toBe("q1");
      const lastMsg = state.messages[state.messages.length - 1];
      expect(lastMsg.content).toContain("hair thinning or hair fall");
    });

    it("auto-fills extracted fields and sets state to cascade phase", () => {
      let state = createInitialEngineState();
      const extractedFields: CascadeFieldItem[] = [
        {
          key: "age_hair_loss_began",
          label: "Age hair loss began",
          value: 45,
          displayValue: "45 years old",
          confidence: 0.95,
          questionId: "q1",
        },
        {
          key: "duration",
          label: "Duration",
          value: "6-12 months",
          displayValue: "6-12 months",
          confidence: 0.9,
          questionId: "q2",
        },
        {
          key: "family_history",
          label: "Family history",
          value: ["Father had hair loss"],
          displayValue: "Father had hair loss",
          confidence: 0.9,
          questionId: "q3",
        },
        {
          key: "pattern",
          label: "Hair loss pattern",
          value: ["Thinning at crown"],
          displayValue: "Thinning at crown",
          confidence: 0.95,
          questionId: "q4",
        },
      ];

      state = applyVoiceCascade(state, {
        fields: extractedFields,
        genderInference: {
          inferred_gender: "male",
          confidence: 0.9,
          cues: "your mention of '45 saal ka hoon'",
        },
        voice: {
          codemixTranscript: "Main 45 saal ka hoon. 8 mahine se crown area me thinning ho rahi hai.",
          translateTranscript: "I am 45 years old. For 8 months thinning in crown area.",
          durationSeconds: 15,
        },
      });

      expect(state.phase).toBe("cascade");
      expect(state.pendingCascade?.fields.length).toBe(4);
      expect(state.messages.some((m) => m.content.includes("4 questions auto-filled"))).toBe(true);
    });

    it("confirming cascade commits fields to formData, marks them answered, and prompts gender confirmation if confident", () => {
      let state = createInitialEngineState();
      const extractedFields: CascadeFieldItem[] = [
        {
          key: "age_hair_loss_began",
          label: "Age hair loss began",
          value: 45,
          displayValue: "45 years old",
          confidence: 0.95,
          questionId: "q1",
        },
        {
          key: "duration",
          label: "Duration",
          value: "6-12 months",
          displayValue: "6-12 months",
          confidence: 0.9,
          questionId: "q2",
        },
      ];

      state = applyVoiceCascade(state, {
        fields: extractedFields,
        genderInference: {
          inferred_gender: "male",
          confidence: 0.92,
          cues: "your mention of '45 saal ka hoon'",
        },
      });

      state = confirmCascade(state);

      expect(state.formData.age_hair_loss_began).toBe(45);
      expect(state.formData.duration).toBe("6-12 months");
      expect(state.answeredQuestionIds).toContain("q1");
      expect(state.answeredQuestionIds).toContain("q2");
      expect(state.phase).toBe("gender_confirm");
      expect(state.messages.some((m) => m.content.includes("Sound right?"))).toBe(true);
    });

    it("confirming male gender inference sets inferredSex, auto-skips Q6/Q7 hormonal, and advances to first unanswered question", () => {
      let state = createInitialEngineState();
      const extractedFields: CascadeFieldItem[] = [
        {
          key: "age_hair_loss_began",
          label: "Age hair loss began",
          value: 45,
          displayValue: "45 years old",
          confidence: 0.95,
          questionId: "q1",
        },
        {
          key: "duration",
          label: "Duration",
          value: "6-12 months",
          displayValue: "6-12 months",
          confidence: 0.9,
          questionId: "q2",
        },
        {
          key: "family_history",
          label: "Family history",
          value: ["Father had hair loss"],
          displayValue: "Father had hair loss",
          confidence: 0.9,
          questionId: "q3",
        },
        {
          key: "pattern",
          label: "Hair loss pattern",
          value: ["Thinning at crown"],
          displayValue: "Thinning at crown",
          confidence: 0.95,
          questionId: "q4",
        },
      ];

      state = applyVoiceCascade(state, {
        fields: extractedFields,
        genderInference: {
          inferred_gender: "male",
          confidence: 0.92,
          cues: "your mention of '45 saal ka hoon'",
        },
      });

      state = confirmCascade(state);
      expect(state.phase).toBe("gender_confirm");

      state = confirmGenderInference(state, true);
      expect(state.inferredSex).toBe("male");
      expect(state.formData.menstrual_cycle).toBe("Not applicable");
      expect(state.formData.pregnancy_related).toBe("Not applicable");
      expect(state.answeredQuestionIds).toContain("q6_q7_hormonal");
      expect(state.phase).toBe("in_progress");
      // Q1-Q4 filled, Q5 unanswered -> jumps to Q5
      expect(state.currentStepId).toBe("q5");
    });

    it("declining gender inference keeps unified hormonal card and advances to next unanswered question", () => {
      let state = createInitialEngineState();
      const extractedFields: CascadeFieldItem[] = [
        {
          key: "age_hair_loss_began",
          label: "Age hair loss began",
          value: 28,
          displayValue: "28 years old",
          confidence: 0.95,
          questionId: "q1",
        },
      ];

      state = applyVoiceCascade(state, {
        fields: extractedFields,
        genderInference: {
          inferred_gender: "female",
          confidence: 0.85,
          cues: "content clues",
        },
      });

      state = confirmCascade(state);
      state = confirmGenderInference(state, false);

      expect(state.inferredSex).toBeNull();
      expect(state.answeredQuestionIds).not.toContain("q6_q7_hormonal");
      expect(state.phase).toBe("in_progress");
      expect(state.currentStepId).toBe("q2");
    });

    it("skips questions that are already answered during sequential progression", () => {
      let state = createInitialEngineState();
      state = startStepByStep(state);
      // Pre-fill Q3 and Q4 (e.g. from partial extraction)
      state.formData.family_history = ["Mother had hair loss"];
      state.answeredQuestionIds.push("q3");
      state.formData.pattern = ["Diffuse thinning"];
      state.answeredQuestionIds.push("q4");

      // Current step is Q1 -> answer Q1
      state = answerCurrentQuestion(state, 25);
      state = answerCurrentQuestion(state, "female"); // q_biological_sex
      expect(state.currentStepId).toBe("q2");

      // Answer Q2 -> since Q3 and Q4 are already answered, engine should skip to Q5!
      state = answerCurrentQuestion(state, "Over a year");
      expect(state.currentStepId).toBe("q5");
    });

    it("voice cascade that fills all 16 questions transitions directly to review screen", () => {
      let state = createInitialEngineState();
      const allFieldItems: CascadeFieldItem[] = [
        { key: "age_hair_loss_began", label: "Age", value: 35, displayValue: "35", confidence: 1, questionId: "q1" },
        { key: "duration", label: "Duration", value: "Over a year", displayValue: "Over a year", confidence: 1, questionId: "q2" },
        { key: "family_history", label: "Family", value: ["Father had hair loss"], displayValue: "Father had hair loss", confidence: 1, questionId: "q3" },
        { key: "pattern", label: "Pattern", value: ["Thinning at crown"], displayValue: "Thinning at crown", confidence: 1, questionId: "q4" },
        { key: "diagnosed_conditions", label: "Conditions", value: ["None"], displayValue: "None", confidence: 1, questionId: "q5" },
        { key: "menstrual_cycle", label: "Periods", value: "Not applicable", displayValue: "Not applicable", confidence: 1, questionId: "q6_q7_hormonal" },
        { key: "pregnancy_related", label: "Maternal", value: "Not applicable", displayValue: "Not applicable", confidence: 1, questionId: "q6_q7_hormonal" },
        { key: "skin_body_markers", label: "Skin", value: { adult_acne_oily_skin: false, excess_body_facial_hair: false }, displayValue: "No", confidence: 1, questionId: "q8_q9_skin" },
        { key: "smoking", label: "Smoking", value: false, displayValue: "No", confidence: 1, questionId: "q11_smoking" },
        { key: "alcohol", label: "Alcohol", value: false, displayValue: "No", confidence: 1, questionId: "q11_alcohol" },
        { key: "hard_water", label: "Hard water", value: false, displayValue: "No", confidence: 1, questionId: "q11_hard_water" },
        { key: "hair_wash_frequency", label: "Wash freq", value: "Daily", displayValue: "Daily", confidence: 1, questionId: "q11_hair_wash_frequency" },
        { key: "heating_tools_styling_chemicals", label: "Heat tools", value: false, displayValue: "No", confidence: 1, questionId: "q11_heating_tools" },
        { key: "salon_treatments", label: "Salon", value: false, displayValue: "No", confidence: 1, questionId: "q11_salon_treatments" },
        { key: "past_6_months", label: "Past 6mo", value: ["None"], displayValue: "None", confidence: 1, questionId: "q10_past_6_months" },
        { key: "products", label: "Products", value: [], displayValue: "None", confidence: 1, questionId: "q12_products_select" },
        { key: "procedures", label: "Procedures", value: [], displayValue: "None", confidence: 1, questionId: "q13_procedures_gate" },
        { key: "past_treatment_side_effects", label: "Side effects", value: false, displayValue: "No", confidence: 1, questionId: "q14_side_effects_gate" },
        { key: "sample_type", label: "Sample", value: "Saliva", displayValue: "Saliva", confidence: 1, questionId: "q15_sample_type" },
        { key: "consent", label: "Consent", value: true, displayValue: "Yes", confidence: 1, questionId: "q16_consent" },
      ];

      state = applyVoiceCascade(state, {
        fields: allFieldItems,
      });
      state = confirmCascade(state);

      expect(state.phase).toBe("review");
      expect(state.currentStepId).toBeNull();
    });

    it("allows updating an individual cascade field before confirming", () => {
      let state = createInitialEngineState();
      const extractedFields: CascadeFieldItem[] = [
        {
          key: "age_hair_loss_began",
          label: "Age hair loss began",
          value: 45,
          displayValue: "45 years old",
          confidence: 0.95,
          questionId: "q1",
        },
      ];

      state = applyVoiceCascade(state, { fields: extractedFields });
      state = updateCascadeField(state, "q1", 42, "42 years old");

      expect(state.pendingCascade?.fields[0].value).toBe(42);
      expect(state.pendingCascade?.fields[0].displayValue).toBe("42 years old");
    });
  });
});


