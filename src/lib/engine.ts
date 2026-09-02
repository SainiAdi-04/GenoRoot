import { ALL_QUESTIONS, WELCOME_MESSAGE } from "@/data/questions";
import {
  CascadeFieldItem,
  ChatMessage,
  EngineState,
  GenderInference,
  IntakeFormData,
  QuestionConfig,
} from "@/types/schema";
import { parseVoiceTranscript } from "./voiceParser";

export const PRODUCT_CATEGORIES = [
  "OTC/Medicated Shampoos",
  "Hair Oils/Serums",
  "Topical Minoxidil",
  "Oral Minoxidil",
  "Supplements",
] as const;

export const PROCEDURE_CATEGORIES = [
  "PRP/GFC/iPRF",
  "Stem Cells/Exosomes",
  "Hair Transplant",
  "Other",
] as const;

export const DEFAULT_HABITS = {
  smoking: false,
  smoking_severity: null,
  alcohol: false,
  hard_water: false,
  hair_wash_frequency: "Alternate Days" as const,
  heating_tools_styling_chemicals: false,
  salon_treatments: false,
  salon_treatment_detail: null,
};

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function createInitialEngineState(): EngineState {
  const welcomeMsg: ChatMessage = {
    id: "msg_welcome",
    sender: "bot",
    content: WELCOME_MESSAGE.text,
    timestamp: Date.now(),
  };

  return {
    phase: "welcome",
    currentStepId: null,
    currentQuestionIndex: 0,
    answeredQuestionIds: [],
    formData: {},
    messages: [welcomeMsg],
    inferredSex: null,
    editingStepId: null,
  };
}

export function resetEngineState(): EngineState {
  return createInitialEngineState();
}

export function startStepByStep(state: EngineState): EngineState {
  const firstQ = ALL_QUESTIONS.find((q) => q.id === "q1");
  if (!firstQ) return state;

  const firstQMsg: ChatMessage = {
    id: `msg_q_${firstQ.id}`,
    sender: "bot",
    content: firstQ.prompt,
    timestamp: Date.now(),
    questionId: firstQ.id,
  };

  return {
    ...state,
    phase: "in_progress",
    currentStepId: "q1",
    currentQuestionIndex: 0,
    messages: [...state.messages, firstQMsg],
  };
}

export function getCurrentQuestion(
  state: EngineState,
  questions: QuestionConfig[] = ALL_QUESTIONS
): QuestionConfig | null {
  if (state.phase !== "in_progress" || !state.currentStepId) {
    return null;
  }

  const stepId = state.currentStepId;

  // 1. Static questions in ALL_QUESTIONS
  const staticQ = questions.find((q) => q.id === stepId);
  if (staticQ) {
    return staticQ;
  }

  // 2. Dynamic Product Follow-up Steps
  // Format: q12_prod_<slug>_duration | _helped | _side_effects
  if (stepId.startsWith("q12_prod_")) {
    let subType = "";
    let prodSlug = "";

    if (stepId.endsWith("_side_effects")) {
      subType = "side_effects";
      prodSlug = stepId.replace(/^q12_prod_/, "").replace(/_side_effects$/, "");
    } else if (stepId.endsWith("_duration")) {
      subType = "duration";
      prodSlug = stepId.replace(/^q12_prod_/, "").replace(/_duration$/, "");
    } else if (stepId.endsWith("_helped")) {
      subType = "helped";
      prodSlug = stepId.replace(/^q12_prod_/, "").replace(/_helped$/, "");
    }

    const matchingProduct = PRODUCT_CATEGORIES.find((p) => slugify(p) === prodSlug) || "Product";

    if (subType === "duration") {
      return {
        id: stepId,
        n: 12,
        key: `product_${prodSlug}_duration`,
        sectionId: "D",
        sectionTitle: "Current Hair Care & Treatments",
        type: "single",
        prompt: `For ${matchingProduct}, roughly how long did you use it?`,
        helperText: "Why we ask: Helps your doctor check whether you used it long enough to see results.",
        options: [
          { label: "Less than 3 months (< 3mo)", value: "<3mo" },
          { label: "3 to 6 months (3-6mo)", value: "3-6mo" },
          { label: "Over 6 months (> 6mo)", value: ">6mo" },
        ],
      };
    }

    if (subType === "helped") {
      return {
        id: stepId,
        n: 12,
        key: `product_${prodSlug}_helped`,
        sectionId: "D",
        sectionTitle: "Current Hair Care & Treatments",
        type: "yesno",
        prompt: `Did ${matchingProduct} help improve hair density or reduce shedding?`,
        options: [
          { label: "No", value: "false" },
          { label: "Yes", value: "true" },
        ],
      };
    }

    if (subType === "side_effects") {
      return {
        id: stepId,
        n: 12,
        key: `product_${prodSlug}_side_effects`,
        sectionId: "D",
        sectionTitle: "Current Hair Care & Treatments",
        type: "yesno",
        prompt: `Did you experience any scalp irritation, shedding spikes, or side effects from ${matchingProduct}?`,
        options: [
          { label: "No", value: "false" },
          { label: "Yes", value: "true" },
        ],
      };
    }
  }

  // 3. Dynamic Procedure Follow-up Steps
  // Format: q13_proc_<slug>_sessions | _helped
  if (stepId.startsWith("q13_proc_")) {
    let subType = "";
    let procSlug = "";

    if (stepId.endsWith("_sessions")) {
      subType = "sessions";
      procSlug = stepId.replace(/^q13_proc_/, "").replace(/_sessions$/, "");
    } else if (stepId.endsWith("_helped")) {
      subType = "helped";
      procSlug = stepId.replace(/^q13_proc_/, "").replace(/_helped$/, "");
    }

    const matchingProcedure = PROCEDURE_CATEGORIES.find((p) => slugify(p) === procSlug) || "Procedure";

    if (subType === "sessions") {
      return {
        id: stepId,
        n: 13,
        key: `procedure_${procSlug}_sessions`,
        sectionId: "D",
        sectionTitle: "Current Hair Care & Treatments",
        type: "single",
        prompt: `How many sessions of ${matchingProcedure} did you complete?`,
        options: [
          { label: "1 to 3 sessions", value: "1-3" },
          { label: "4 to 6 sessions", value: "4-6" },
          { label: "More than 6 sessions (> 6)", value: ">6" },
        ],
      };
    }

    if (subType === "helped") {
      return {
        id: stepId,
        n: 13,
        key: `procedure_${procSlug}_helped`,
        sectionId: "D",
        sectionTitle: "Current Hair Care & Treatments",
        type: "yesno",
        prompt: `Did ${matchingProcedure} produce noticeable improvement in your hair?`,
        options: [
          { label: "No", value: "false" },
          { label: "Yes", value: "true" },
        ],
      };
    }
  }

  return null;
}

export function formatUserAnswer(
  question: QuestionConfig,
  answerValue: unknown
): string {
  if (answerValue === null || answerValue === undefined) {
    return "Skipped";
  }

  if (question.type === "number") {
    const num = Number(answerValue);
    if (question.unit) {
      return `${num} ${question.unit}`;
    }
    return `${num}`;
  }

  if (question.type === "combined_yesno") {
    const val = answerValue as { adult_acne_oily_skin?: boolean; excess_body_facial_hair?: boolean };
    const acneStr = val.adult_acne_oily_skin ? "Acne/oily skin: Yes" : "Acne/oily skin: No";
    const hairStr = val.excess_body_facial_hair ? "Excess hair: Yes" : "Excess hair: No";
    return `${acneStr} • ${hairStr}`;
  }

  if (Array.isArray(answerValue)) {
    if (answerValue.length === 0) return "None";
    return answerValue.join(", ");
  }

  if (typeof answerValue === "boolean") {
    return answerValue ? "Yes" : "No";
  }

  if (answerValue === "true") return "Yes";
  if (answerValue === "false") return "No";

  return String(answerValue);
}

// Sequential flow question order
export const FLOW_QUESTION_ORDER = [
  "q1",
  "q_biological_sex",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6_q7_hormonal",
  "q8_q9_skin",
  "q11_smoking",
  "q11_alcohol",
  "q11_hard_water",
  "q11_hair_wash_frequency",
  "q11_heating_tools",
  "q11_salon_treatments",
  "q10_past_6_months",
  "q12_products_select",
  "q13_procedures_gate",
  "q14_side_effects_gate",
  "q15_sample_type",
  "q16_consent",
] as const;

export function isQuestionAnswered(questionId: string, state: EngineState): boolean {
  if (state.answeredQuestionIds?.includes(questionId)) {
    return true;
  }
  const fd = state.formData;
  switch (questionId) {
    case "q1":
      return fd.age_hair_loss_began != null;
    case "q_biological_sex":
      return (
        state.inferredSex != null ||
        state.answeredQuestionIds?.includes("q_biological_sex") ||
        (fd.menstrual_cycle != null && fd.pregnancy_related != null)
      );
    case "q2":
      return fd.duration != null;
    case "q3":
      return Array.isArray(fd.family_history) && fd.family_history.length > 0;
    case "q4":
      return Array.isArray(fd.pattern) && fd.pattern.length > 0;
    case "q5":
      return Array.isArray(fd.diagnosed_conditions) && fd.diagnosed_conditions.length > 0;
    case "q6_q7_hormonal":
      if (state.inferredSex === "male") return true;
      return (
        fd.menstrual_cycle != null &&
        fd.pregnancy_related != null &&
        fd.menstrual_cycle !== "" &&
        fd.pregnancy_related !== ""
      );
    case "q8_q9_skin":
      return fd.adult_acne_oily_skin != null && fd.excess_body_facial_hair != null;
    case "q11_smoking":
      return fd.habits?.smoking != null;
    case "q11_alcohol":
      return fd.habits?.alcohol != null;
    case "q11_hard_water":
      return fd.habits?.hard_water != null;
    case "q11_hair_wash_frequency":
      return fd.habits?.hair_wash_frequency != null;
    case "q11_heating_tools":
      return fd.habits?.heating_tools_styling_chemicals != null;
    case "q11_salon_treatments":
      return fd.habits?.salon_treatments != null;
    case "q11_salon_detail":
      return !fd.habits?.salon_treatments || fd.habits?.salon_treatment_detail != null;
    case "q10_past_6_months":
      return Array.isArray(fd.past_6_months) && fd.past_6_months.length > 0;
    case "q12_products_select":
      return Array.isArray(fd.products) && fd.products.length > 0;
    case "q13_procedures_gate":
      return Array.isArray(fd.procedures) && fd.procedures.length > 0;
    case "q14_side_effects_gate":
      return fd.past_treatment_side_effects != null;
    case "q15_sample_type":
      return fd.sample_type != null;
    case "q16_consent":
      return fd.consent != null;
    default:
      return false;
  }
}

// Compute the next step and any transition message
interface NextStepResult {
  nextStepId: string | null;
  transitionMessage?: string;
  isCompleted?: boolean;
}

export function getRawNextStep(
  currentStepId: string,
  updatedFormData: IntakeFormData,
  inferredSex?: "male" | "female" | null
): NextStepResult {
  switch (currentStepId) {
    case "q1":
      if (inferredSex != null) {
        return { nextStepId: "q2" };
      }
      return { nextStepId: "q_biological_sex" };
    case "q_biological_sex":
      return { nextStepId: "q2" };
    case "q2":
      return { nextStepId: "q3" };
    case "q3":
      return { nextStepId: "q4" };
    case "q4":
      return {
        nextStepId: "q5",
        transitionMessage:
          "✓ Thanks for sharing that background. Now let's look at health and hormonal factors that directly influence hair.",
      };
    case "q5":
      if (inferredSex === "male") {
        return {
          nextStepId: "q8_q9_skin",
          transitionMessage:
            "✓ Got it. Next, two quick checks on your skin and scalp oiliness:",
        };
      }
      return { nextStepId: "q6_q7_hormonal" };
    case "q6_q7_hormonal":
      return { nextStepId: "q8_q9_skin" };
    case "q8_q9_skin":
      return {
        nextStepId: "q11_smoking",
        transitionMessage:
          "✓ Thanks for confirming. Now a few questions about your lifestyle — this helps us spot underlying triggers.",
      };
    case "q11_smoking":
      return { nextStepId: "q11_alcohol" };
    case "q11_alcohol":
      return {
        nextStepId: "q11_hard_water",
        transitionMessage:
          "Got it on the health habits. Now let's quickly cover your daily hair care routine.",
      };
    case "q11_hard_water":
      return { nextStepId: "q11_hair_wash_frequency" };
    case "q11_hair_wash_frequency":
      return { nextStepId: "q11_heating_tools" };
    case "q11_heating_tools":
      return { nextStepId: "q11_salon_treatments" };
    case "q11_salon_treatments":
      if (updatedFormData.habits?.salon_treatments) {
        return { nextStepId: "q11_salon_detail" };
      }
      return { nextStepId: "q10_past_6_months" };
    case "q11_salon_detail":
      return { nextStepId: "q10_past_6_months" };
    case "q10_past_6_months":
      return {
        nextStepId: "q12_products_select",
        transitionMessage:
          "✓ Thanks. Now let's review any past treatments or products you've tried.",
      };
    case "q12_products_select": {
      const selectedProducts = (updatedFormData.products || []).filter((p) => p.used);
      if (selectedProducts.length === 0) {
        return { nextStepId: "q13_procedures_gate" };
      }
      const firstProd = selectedProducts[0];
      return { nextStepId: `q12_prod_${slugify(firstProd.name)}_duration` };
    }
    default:
      break;
  }

  // Handle dynamic product follow-ups
  if (currentStepId.startsWith("q12_prod_")) {
    let subType = "";
    let prodSlug = "";

    if (currentStepId.endsWith("_side_effects")) {
      subType = "side_effects";
      prodSlug = currentStepId.replace(/^q12_prod_/, "").replace(/_side_effects$/, "");
    } else if (currentStepId.endsWith("_duration")) {
      subType = "duration";
      prodSlug = currentStepId.replace(/^q12_prod_/, "").replace(/_duration$/, "");
    } else if (currentStepId.endsWith("_helped")) {
      subType = "helped";
      prodSlug = currentStepId.replace(/^q12_prod_/, "").replace(/_helped$/, "");
    }

    const selectedProducts = (updatedFormData.products || []).filter((p) => p.used);
    const currentIndex = selectedProducts.findIndex((p) => slugify(p.name) === prodSlug);

    if (subType === "duration") {
      return { nextStepId: `q12_prod_${prodSlug}_helped` };
    }
    if (subType === "helped") {
      return { nextStepId: `q12_prod_${prodSlug}_side_effects` };
    }
    if (subType === "side_effects") {
      // Move to next selected product or advance to Q13 procedures gate
      if (currentIndex >= 0 && currentIndex < selectedProducts.length - 1) {
        const nextProd = selectedProducts[currentIndex + 1];
        return { nextStepId: `q12_prod_${slugify(nextProd.name)}_duration` };
      }
      return { nextStepId: "q13_procedures_gate" };
    }
  }

  // Handle Q13 procedures flow
  if (currentStepId === "q13_procedures_gate") {
    // If user selected Yes, move to procedures multi-select
    const hadProcedures = (updatedFormData.procedures || []).some((p) => p.done);
    if (hadProcedures) {
      return { nextStepId: "q13_procedures_select" };
    }
    return { nextStepId: "q14_side_effects_gate" };
  }

  if (currentStepId === "q13_procedures_select") {
    const selectedProcs = (updatedFormData.procedures || []).filter((p) => p.done);
    if (selectedProcs.length === 0) {
      return { nextStepId: "q14_side_effects_gate" };
    }
    const firstProc = selectedProcs[0];
    return { nextStepId: `q13_proc_${slugify(firstProc.name)}_sessions` };
  }

  // Handle dynamic procedure follow-ups
  if (currentStepId.startsWith("q13_proc_")) {
    let subType = "";
    let procSlug = "";

    if (currentStepId.endsWith("_sessions")) {
      subType = "sessions";
      procSlug = currentStepId.replace(/^q13_proc_/, "").replace(/_sessions$/, "");
    } else if (currentStepId.endsWith("_helped")) {
      subType = "helped";
      procSlug = currentStepId.replace(/^q13_proc_/, "").replace(/_helped$/, "");
    }

    const selectedProcs = (updatedFormData.procedures || []).filter((p) => p.done);
    const currentIndex = selectedProcs.findIndex((p) => slugify(p.name) === procSlug);

    if (subType === "sessions") {
      return { nextStepId: `q13_proc_${procSlug}_helped` };
    }
    if (subType === "helped") {
      if (currentIndex >= 0 && currentIndex < selectedProcs.length - 1) {
        const nextProc = selectedProcs[currentIndex + 1];
        return { nextStepId: `q13_proc_${slugify(nextProc.name)}_sessions` };
      }
      return { nextStepId: "q14_side_effects_gate" };
    }
  }

  // Handle Q14 past treatment side effects
  if (currentStepId === "q14_side_effects_gate") {
    if (updatedFormData.past_treatment_side_effects) {
      return { nextStepId: "q14_side_effects_describe" };
    }
    return {
      nextStepId: "q15_sample_type",
      transitionMessage:
        "✓ Thank you. Final step — sample collection preference and consent for your personalized analysis.",
    };
  }

  if (currentStepId === "q14_side_effects_describe") {
    return {
      nextStepId: "q15_sample_type",
      transitionMessage:
        "✓ Thank you. Final step — sample collection preference and consent for your personalized analysis.",
    };
  }

  // Handle Section E
  if (currentStepId === "q15_sample_type") {
    return { nextStepId: "q16_consent" };
  }

  if (currentStepId === "q16_consent") {
    return {
      nextStepId: null,
      isCompleted: true,
      transitionMessage:
        "✓ Your complete 16-question clinical intake is ready! Review your summary below or edit any field before submitting for your consultation.",
    };
  }

  return { nextStepId: null, isCompleted: true };
}

export function getMicroAffirmation(
  prevStepId: string,
  answerValue: unknown
): string | null {
  switch (prevStepId) {
    case "q1":
      return "Thank you for sharing that. Knowing when changes started gives your doctor helpful context.";
    case "q_biological_sex": {
      const val = String(answerValue);
      if (val === "male") {
        return "Understood. Focusing on male pattern hair loss.";
      }
      if (val === "female") {
        return "Understood. Including details on your cycle and hormone health.";
      }
      return "Understood. Preparing a helpful profile for your doctor.";
    }
    case "q2": {
      const val = String(answerValue);
      if (val.includes("Less than 6 months")) {
        return "Noted. Hair fall under 6 months often points to temporary triggers that can improve.";
      }
      if (val.includes("6")) {
        return "Understood. 6–12 months is an important timeframe for your doctor to evaluate.";
      }
      return "Understood. Hair thinning over a year gives your doctor key clues about long-term patterns.";
    }
    case "q3":
      return "Got it. Family genetics often play a big role in hair density.";
    case "q4":
      return "Thanks for describing what you're noticing on your scalp.";
    case "q5":
      return "Got it. Overall health directly affects how nutrients reach your hair roots.";
    case "q6_q7_hormonal":
      return "Understood. That's really helpful context for your hormone balance.";
    case "q8_q9_skin":
      return "Got it. Skin and scalp changes give great clues about your natural oil balance.";
    case "q11_smoking":
      return "Thank you for sharing. Good blood flow to your scalp is vital for healthy hair roots.";
    case "q11_hard_water":
      return "Got it. Water quality is an important factor for hair texture and breakage.";
    case "q11_hair_wash_frequency":
      return "Understood. That helps assess your scalp's natural balance.";
    case "q10_past_6_months":
      return "Thank you for letting us know. High stress or illness can often explain sudden shedding phases.";
    case "q12_products_select":
      return "Got it. Knowing what you've tried helps your doctor avoid suggesting what didn't work.";
    case "q13_procedures_gate":
      return "Understood. Your procedure history helps your doctor plan next steps.";
    case "q14_side_effects_gate":
      return "Important to know. Your doctor will make sure to avoid anything that irritated your scalp.";
    case "q15_sample_type":
      return "Got it. We'll set up your preferred testing method.";
    default:
      return null;
  }
}

export function determineNextStep(
  currentStepId: string,
  updatedFormData: IntakeFormData,
  answeredQuestionIds: string[] = [],
  inferredSex?: "male" | "female" | null
): NextStepResult {
  let stepResult = getRawNextStep(currentStepId, updatedFormData, inferredSex);
  let gatheredTransition = stepResult.transitionMessage;

  while (
    stepResult.nextStepId &&
    answeredQuestionIds.includes(stepResult.nextStepId)
  ) {
    const candidateId = stepResult.nextStepId;
    stepResult = getRawNextStep(candidateId, updatedFormData, inferredSex);
    if (stepResult.transitionMessage) {
      gatheredTransition = stepResult.transitionMessage;
    }
  }

  return {
    nextStepId: stepResult.nextStepId,
    transitionMessage: gatheredTransition,
    isCompleted: stepResult.isCompleted,
  };
}

export function answerCurrentQuestion(
  state: EngineState,
  answerValue: unknown,
  questions: QuestionConfig[] = ALL_QUESTIONS,
  customUserMessage?: ChatMessage
): EngineState {
  const currentQ = getCurrentQuestion(state, questions);
  if (!currentQ) return state;

  const updatedFormData: IntakeFormData = { ...state.formData };
  const stepId = currentQ.id;

  let updatedInferredSex = state.inferredSex;
  const updatedAnsweredIds = state.answeredQuestionIds.includes(currentQ.id)
    ? [...state.answeredQuestionIds]
    : [...state.answeredQuestionIds, currentQ.id];

  // Apply value to formData based on step
  if (stepId === "q1") {
    updatedFormData.age_hair_loss_began = Number(answerValue);
  } else if (stepId === "q_biological_sex") {
    const val = String(answerValue);
    if (val === "male") {
      updatedInferredSex = "male";
      updatedFormData.menstrual_cycle = "Not applicable";
      updatedFormData.pregnancy_related = "Not applicable";
      if (!updatedAnsweredIds.includes("q6_q7_hormonal")) {
        updatedAnsweredIds.push("q6_q7_hormonal");
      }
    } else if (val === "female") {
      updatedInferredSex = "female";
    }
  } else if (stepId === "q2") {
    updatedFormData.duration = String(answerValue);
  } else if (stepId === "q3") {
    updatedFormData.family_history = Array.isArray(answerValue) ? answerValue : [String(answerValue)];
  } else if (stepId === "q4") {
    updatedFormData.pattern = Array.isArray(answerValue) ? answerValue : [String(answerValue)];
  } else if (stepId === "q5") {
    updatedFormData.diagnosed_conditions = Array.isArray(answerValue) ? answerValue : [String(answerValue)];
  } else if (stepId === "q6_q7_hormonal") {
    const val = String(answerValue);
    if (val === "Regular periods") {
      updatedFormData.menstrual_cycle = "Regular";
      updatedFormData.pregnancy_related = "Not applicable";
    } else if (val === "Irregular") {
      updatedFormData.menstrual_cycle = "Irregular";
      updatedFormData.pregnancy_related = "Not applicable";
    } else if (val === "Currently pregnant") {
      updatedFormData.menstrual_cycle = "Not applicable";
      updatedFormData.pregnancy_related = "Currently pregnant";
    } else if (val === "Postpartum <1 year") {
      updatedFormData.menstrual_cycle = "Not applicable";
      updatedFormData.pregnancy_related = "Postpartum <1 year";
    } else if (val === "Menopausal") {
      updatedFormData.menstrual_cycle = "Menopausal";
      updatedFormData.pregnancy_related = "Not applicable";
    } else {
      updatedFormData.menstrual_cycle = "Not applicable";
      updatedFormData.pregnancy_related = "Not applicable";
    }
  } else if (stepId === "q8_q9_skin") {
    const val = answerValue as { adult_acne_oily_skin?: boolean; excess_body_facial_hair?: boolean };
    updatedFormData.adult_acne_oily_skin = Boolean(val.adult_acne_oily_skin);
    updatedFormData.excess_body_facial_hair = Boolean(val.excess_body_facial_hair);
  } else if (stepId === "q11_smoking") {
    const val = String(answerValue);
    const existingHabits = updatedFormData.habits || {
      smoking: false,
      alcohol: false,
      hard_water: false,
      hair_wash_frequency: "Alternate Days",
      heating_tools_styling_chemicals: false,
      salon_treatments: false,
    };
    if (val === "No") {
      updatedFormData.habits = {
        ...existingHabits,
        smoking: false,
        smoking_severity: null,
      };
    } else {
      updatedFormData.habits = {
        ...existingHabits,
        smoking: true,
        smoking_severity: val as "Mild <5/day" | "Moderate 5-10/day" | "Severe >10/day",
      };
    }
  } else if (stepId === "q11_alcohol") {
    const val = answerValue === "true" || answerValue === true;
    const existingHabits = updatedFormData.habits || {
      smoking: false,
      alcohol: false,
      hard_water: false,
      hair_wash_frequency: "Alternate Days",
      heating_tools_styling_chemicals: false,
      salon_treatments: false,
    };
    updatedFormData.habits = { ...existingHabits, alcohol: val };
  } else if (stepId === "q11_hard_water") {
    const val = answerValue === "true" || answerValue === true;
    const existingHabits = updatedFormData.habits || {
      smoking: false,
      alcohol: false,
      hard_water: false,
      hair_wash_frequency: "Alternate Days",
      heating_tools_styling_chemicals: false,
      salon_treatments: false,
    };
    updatedFormData.habits = { ...existingHabits, hard_water: val };
  } else if (stepId === "q11_hair_wash_frequency") {
    const existingHabits = updatedFormData.habits || {
      smoking: false,
      alcohol: false,
      hard_water: false,
      hair_wash_frequency: "Alternate Days",
      heating_tools_styling_chemicals: false,
      salon_treatments: false,
    };
    updatedFormData.habits = { ...existingHabits, hair_wash_frequency: String(answerValue) };
  } else if (stepId === "q11_heating_tools") {
    const val = answerValue === "true" || answerValue === true;
    const existingHabits = updatedFormData.habits || {
      smoking: false,
      alcohol: false,
      hard_water: false,
      hair_wash_frequency: "Alternate Days",
      heating_tools_styling_chemicals: false,
      salon_treatments: false,
    };
    updatedFormData.habits = { ...existingHabits, heating_tools_styling_chemicals: val };
  } else if (stepId === "q11_salon_treatments") {
    const val = answerValue === "true" || answerValue === true;
    const existingHabits = updatedFormData.habits || {
      smoking: false,
      alcohol: false,
      hard_water: false,
      hair_wash_frequency: "Alternate Days",
      heating_tools_styling_chemicals: false,
      salon_treatments: false,
    };
    updatedFormData.habits = {
      ...existingHabits,
      salon_treatments: val,
      salon_treatment_detail: val ? existingHabits.salon_treatment_detail : null,
    };
  } else if (stepId === "q11_salon_detail") {
    const existingHabits = updatedFormData.habits || {
      smoking: false,
      alcohol: false,
      hard_water: false,
      hair_wash_frequency: "Alternate Days",
      heating_tools_styling_chemicals: false,
      salon_treatments: true,
    };
    updatedFormData.habits = { ...existingHabits, salon_treatment_detail: String(answerValue) };
  } else if (stepId === "q10_past_6_months") {
    updatedFormData.past_6_months = Array.isArray(answerValue) ? answerValue : [String(answerValue)];
  } else if (stepId === "q12_products_select") {
    const rawSelected = Array.isArray(answerValue) ? answerValue : [String(answerValue)];
    const selected = rawSelected.filter((v) => v !== "None");

    updatedFormData.products = PRODUCT_CATEGORIES.map((catName) => {
      const isSelected = selected.includes(catName);
      return {
        name: catName,
        used: isSelected,
        duration: isSelected ? null : null,
        helped: isSelected ? null : null,
        side_effects: isSelected ? null : null,
      };
    });
  } else if (stepId.startsWith("q12_prod_")) {
    let subType = "";
    let prodSlug = "";

    if (stepId.endsWith("_side_effects")) {
      subType = "side_effects";
      prodSlug = stepId.replace(/^q12_prod_/, "").replace(/_side_effects$/, "");
    } else if (stepId.endsWith("_duration")) {
      subType = "duration";
      prodSlug = stepId.replace(/^q12_prod_/, "").replace(/_duration$/, "");
    } else if (stepId.endsWith("_helped")) {
      subType = "helped";
      prodSlug = stepId.replace(/^q12_prod_/, "").replace(/_helped$/, "");
    }

    const products = [...(updatedFormData.products || [])];
    const target = products.find((p) => slugify(p.name) === prodSlug);
    if (target) {
      if (subType === "duration") {
        target.duration = String(answerValue);
      } else if (subType === "helped") {
        target.helped = answerValue === "true" || answerValue === true;
      } else if (subType === "side_effects") {
        target.side_effects = answerValue === "true" || answerValue === true;
      }
    }
    updatedFormData.products = products;
  } else if (stepId === "q13_procedures_gate") {
    const isYes = answerValue === "true" || answerValue === true;
    if (!isYes) {
      updatedFormData.procedures = PROCEDURE_CATEGORIES.map((p) => ({
        name: p,
        done: false,
        sessions: null,
        helped: null,
      }));
    } else {
      // Mark placeholder until specific procedures selected
      updatedFormData.procedures = PROCEDURE_CATEGORIES.map((p) => ({
        name: p,
        done: true,
        sessions: null,
        helped: null,
      }));
    }
  } else if (stepId === "q13_procedures_select") {
    const selected = Array.isArray(answerValue) ? answerValue : [String(answerValue)];
    updatedFormData.procedures = PROCEDURE_CATEGORIES.map((procName) => ({
      name: procName,
      done: selected.includes(procName),
      sessions: null,
      helped: null,
    }));
  } else if (stepId.startsWith("q13_proc_")) {
    let subType = "";
    let procSlug = "";

    if (stepId.endsWith("_sessions")) {
      subType = "sessions";
      procSlug = stepId.replace(/^q13_proc_/, "").replace(/_sessions$/, "");
    } else if (stepId.endsWith("_helped")) {
      subType = "helped";
      procSlug = stepId.replace(/^q13_proc_/, "").replace(/_helped$/, "");
    }

    const procedures = [...(updatedFormData.procedures || [])];
    const target = procedures.find((p) => slugify(p.name) === procSlug);
    if (target) {
      if (subType === "sessions") {
        target.sessions = String(answerValue);
      } else if (subType === "helped") {
        target.helped = answerValue === "true" || answerValue === true;
      }
    }
    updatedFormData.procedures = procedures;
  } else if (stepId === "q14_side_effects_gate") {
    const isYes = answerValue === "true" || answerValue === true;
    updatedFormData.past_treatment_side_effects = isYes;
    if (!isYes) {
      updatedFormData.past_treatment_side_effects_describe = null;
    }
  } else if (stepId === "q14_side_effects_describe") {
    updatedFormData.past_treatment_side_effects_describe = String(answerValue);
  } else if (stepId === "q15_sample_type") {
    updatedFormData.sample_type = String(answerValue);
  } else if (stepId === "q16_consent") {
    updatedFormData.consent = answerValue === "true" || answerValue === true;
  }

  // Create user message
  const userMsg: ChatMessage =
    customUserMessage || {
      id: `msg_user_${currentQ.id}_${Date.now()}`,
      sender: "user",
      content: formatUserAnswer(currentQ, answerValue),
      timestamp: Date.now(),
      questionId: currentQ.id,
    };

  const newMessages = [...state.messages, userMsg];

  // If in editing mode and not a gate opening sub-steps, return to review directly
  if (state.editingStepId) {
    // Check if editing a gate that needs follow-up
    if (
      (stepId === "q11_salon_treatments" && updatedFormData.habits?.salon_treatments) ||
      (stepId === "q14_side_effects_gate" && updatedFormData.past_treatment_side_effects)
    ) {
      // Continue to detail question
      const next = determineNextStep(stepId, updatedFormData, updatedAnsweredIds);
      if (next.nextStepId) {
        const nextQ = getCurrentQuestion(
          { ...state, phase: "in_progress", currentStepId: next.nextStepId, formData: updatedFormData },
          questions
        );
        if (nextQ) {
          newMessages.push({
            id: `msg_q_${nextQ.id}_${Date.now()}`,
            sender: "bot",
            content: nextQ.prompt,
            timestamp: Date.now() + 1,
            questionId: nextQ.id,
          });
          return {
            ...state,
            currentStepId: next.nextStepId,
            answeredQuestionIds: updatedAnsweredIds,
            formData: updatedFormData,
            messages: newMessages,
          };
        }
      }
    }

    // Return to review
    newMessages.push({
      id: `msg_edit_done_${Date.now()}`,
      sender: "bot",
      content: "✓ Your update has been saved.",
      timestamp: Date.now() + 1,
      isTransition: true,
    });

    return {
      ...state,
      phase: "review",
      editingStepId: null,
      currentStepId: null,
      answeredQuestionIds: updatedAnsweredIds,
      formData: updatedFormData,
      messages: newMessages,
    };
  }

  // Determine next step
  const nextResult = determineNextStep(stepId, updatedFormData, updatedAnsweredIds, updatedInferredSex);

  if (nextResult.transitionMessage) {
    newMessages.push({
      id: `msg_trans_${Date.now()}`,
      sender: "bot",
      content: nextResult.transitionMessage,
      timestamp: Date.now() + 1,
      isTransition: true,
    });
  }

  if (nextResult.isCompleted || !nextResult.nextStepId) {
    return {
      ...state,
      inferredSex: updatedInferredSex,
      phase: "review",
      currentStepId: null,
      answeredQuestionIds: updatedAnsweredIds,
      formData: updatedFormData,
      messages: newMessages,
    };
  }

  const nextStepId = nextResult.nextStepId;
  const nextQ = getCurrentQuestion(
    { ...state, phase: "in_progress", currentStepId: nextStepId, formData: updatedFormData, inferredSex: updatedInferredSex },
    questions
  );

  if (nextQ) {
    const affirmation = getMicroAffirmation(stepId, answerValue);
    const content = affirmation ? `${affirmation}\n\n${nextQ.prompt}` : nextQ.prompt;

    newMessages.push({
      id: `msg_q_${nextQ.id}_${Date.now()}`,
      sender: "bot",
      content,
      timestamp: Date.now() + 2,
      questionId: nextQ.id,
    });
  }

  return {
    ...state,
    inferredSex: updatedInferredSex,
    phase: "in_progress",
    currentStepId: nextStepId,
    answeredQuestionIds: updatedAnsweredIds,
    formData: updatedFormData,
    messages: newMessages,
  };
}

export function editQuestion(state: EngineState, stepId: string): EngineState {
  const targetQ = getCurrentQuestion(
    { ...state, phase: "in_progress", currentStepId: stepId },
    ALL_QUESTIONS
  );

  const editPromptMsg: ChatMessage = {
    id: `msg_edit_prompt_${Date.now()}`,
    sender: "bot",
    content: targetQ ? `Let's update this: ${targetQ.prompt}` : "Please update your answer:",
    timestamp: Date.now(),
    questionId: stepId,
  };

  return {
    ...state,
    phase: "in_progress",
    editingStepId: stepId,
    currentStepId: stepId,
    messages: [...state.messages, editPromptMsg],
  };
}

export function formatFullSchemaJson(formData: IntakeFormData) {
  const normalizedProducts = PRODUCT_CATEGORIES.map((name) => {
    const existing = formData.products?.find((p) => p.name === name);
    return {
      name,
      used: existing?.used ?? false,
      duration: existing?.used ? (existing.duration ?? null) : null,
      helped: existing?.used ? (existing.helped ?? null) : null,
      side_effects: existing?.used ? (existing.side_effects ?? null) : null,
    };
  });

  const normalizedProcedures = PROCEDURE_CATEGORIES.map((name) => {
    const existing = formData.procedures?.find((p) => p.name === name);
    return {
      name,
      done: existing?.done ?? false,
      sessions: existing?.done ? (existing.sessions ?? null) : null,
      helped: existing?.done ? (existing.helped ?? null) : null,
    };
  });

  return {
    form: "GenoRoot Hair & Scalp Intake",
    timestamp: new Date().toISOString(),
    intake_data: {
      // Section A
      age_hair_loss_began: formData.age_hair_loss_began ?? null,
      duration: formData.duration ?? null,
      family_history: formData.family_history ?? [],
      pattern: formData.pattern ?? [],

      // Section B
      diagnosed_conditions: formData.diagnosed_conditions ?? [],
      menstrual_cycle: formData.menstrual_cycle ?? "Not applicable",
      pregnancy_related: formData.pregnancy_related ?? "Not applicable",
      adult_acne_oily_skin: formData.adult_acne_oily_skin ?? null,
      excess_body_facial_hair: formData.excess_body_facial_hair ?? null,

      // Section C
      past_6_months: formData.past_6_months ?? [],
      habits: {
        smoking: formData.habits?.smoking ?? false,
        smoking_severity: formData.habits?.smoking ? (formData.habits?.smoking_severity ?? null) : null,
        alcohol: formData.habits?.alcohol ?? false,
        hard_water: formData.habits?.hard_water ?? false,
        hair_wash_frequency: formData.habits?.hair_wash_frequency ?? "Alternate Days",
        heating_tools_styling_chemicals: formData.habits?.heating_tools_styling_chemicals ?? false,
        salon_treatments: formData.habits?.salon_treatments ?? false,
        salon_treatment_detail: formData.habits?.salon_treatments
          ? (formData.habits?.salon_treatment_detail ?? null)
          : null,
      },

      // Section D
      products: normalizedProducts,
      procedures: normalizedProcedures,
      past_treatment_side_effects: formData.past_treatment_side_effects ?? false,
      past_treatment_side_effects_describe: formData.past_treatment_side_effects
        ? (formData.past_treatment_side_effects_describe ?? null)
        : null,

      // Section E
      sample_type: formData.sample_type ?? null,
      consent: formData.consent ?? null,
    },
  };
}

export interface VoiceInputPayload {
  audioUrl?: string;
  durationSeconds?: number;
  codemix: string;
  translate: string;
  isFallback?: boolean;
}

export function answerWithVoice(
  state: EngineState,
  voiceInput: VoiceInputPayload,
  questions: QuestionConfig[] = ALL_QUESTIONS
): EngineState {
  if (state.phase !== "in_progress" || !state.currentStepId) {
    return state;
  }

  const currentQ = getCurrentQuestion(state, questions);
  if (!currentQ) return state;

  const parseRes = parseVoiceTranscript(currentQ.id, currentQ, voiceInput.translate);

  const userVoiceMsg: ChatMessage = {
    id: `msg_user_voice_${currentQ.id}_${Date.now()}`,
    sender: "user",
    content: voiceInput.codemix,
    timestamp: Date.now(),
    questionId: currentQ.id,
    voice: {
      audioUrl: voiceInput.audioUrl,
      durationSeconds: voiceInput.durationSeconds,
      codemixTranscript: voiceInput.codemix,
      translateTranscript: voiceInput.translate,
      isFallback: voiceInput.isFallback,
    },
  };

  if (!parseRes.success || parseRes.value === undefined) {
    const botClarifyMsg: ChatMessage = {
      id: `msg_bot_clarify_${Date.now()}`,
      sender: "bot",
      content: `I heard: "${voiceInput.codemix}". To make sure your records are exact, please enter or select your answer below:`,
      timestamp: Date.now() + 1,
      questionId: currentQ.id,
    };

    return {
      ...state,
      messages: [...state.messages, userVoiceMsg, botClarifyMsg],
    };
  }

  return answerCurrentQuestion(state, parseRes.value, questions, userVoiceMsg);
}

export interface VoiceCascadePayload {
  fields: CascadeFieldItem[];
  genderInference?: GenderInference;
  voice?: {
    audioUrl?: string;
    durationSeconds?: number;
    codemixTranscript?: string;
    translateTranscript?: string;
    isFallback?: boolean;
  };
}

export function applyVoiceCascade(
  state: EngineState,
  payload: VoiceCascadePayload
): EngineState {
  const { fields, genderInference, voice } = payload;
  const newMessages = [...state.messages];

  // Edge Case: Empty or 0 fields extracted (voice not understood / no fields matched)
  if (!fields || fields.length === 0) {
    newMessages.push({
      id: `msg_bot_no_fields_${Date.now()}`,
      sender: "bot",
      content: "Let's walk through your check-in step by step.",
      timestamp: Date.now() + 1,
    });

    const firstQ = ALL_QUESTIONS.find((q) => q.id === "q1");
    if (firstQ) {
      newMessages.push({
        id: `msg_q_${firstQ.id}_${Date.now() + 2}`,
        sender: "bot",
        content: firstQ.prompt,
        timestamp: Date.now() + 2,
        questionId: firstQ.id,
      });
    }

    return {
      ...state,
      phase: "in_progress",
      currentStepId: "q1",
      currentQuestionIndex: 0,
      messages: newMessages,
    };
  }

  // Active cascade: voice was understood and extracted clinical fields
  if (voice && (voice.codemixTranscript || voice.translateTranscript)) {
    newMessages.push({
      id: `msg_user_voice_${Date.now()}`,
      sender: "user",
      content: voice.codemixTranscript || voice.translateTranscript || "Voice note recorded",
      timestamp: Date.now(),
      voice: {
        audioUrl: voice.audioUrl,
        durationSeconds: voice.durationSeconds,
        codemixTranscript: voice.codemixTranscript,
        translateTranscript: voice.translateTranscript,
        isFallback: voice.isFallback,
      },
    });
  }

  // Active cascade with auto-filled fields
  newMessages.push({
    id: `msg_bot_cascade_announcement_${Date.now()}`,
    sender: "bot",
    content: `🎉 ${fields.length} details auto-filled from your voice note! Confirm all in one tap or tap any item to edit:`,
    timestamp: Date.now() + 1,
  });

  return {
    ...state,
    phase: "cascade",
    pendingCascade: {
      fields,
      genderInference,
      status: "pending_confirmation",
    },
    messages: newMessages,
  };
}

export function confirmCascade(
  state: EngineState,
  modifiedFields?: CascadeFieldItem[]
): EngineState {
  const fieldsToApply = modifiedFields || state.pendingCascade?.fields || [];
  const updatedFormData: IntakeFormData = { ...state.formData };
  const updatedAnsweredIds = [...state.answeredQuestionIds];

  for (const field of fieldsToApply) {
    if (!updatedAnsweredIds.includes(field.questionId)) {
      updatedAnsweredIds.push(field.questionId);
    }

    switch (field.key) {
      case "age_hair_loss_began":
        updatedFormData.age_hair_loss_began = field.value as number;
        break;
      case "biological_sex":
        updatedFormData.biological_sex = field.value as "male" | "female" | "prefer_not_to_say";
        break;
      case "duration":
        updatedFormData.duration = field.value as string;
        break;
      case "family_history":
        updatedFormData.family_history = field.value as string[];
        break;
      case "pattern":
        updatedFormData.pattern = field.value as string[];
        break;
      case "diagnosed_conditions":
        updatedFormData.diagnosed_conditions = field.value as string[];
        break;
      case "menstrual_cycle":
        updatedFormData.menstrual_cycle = field.value as string;
        break;
      case "pregnancy_related":
        updatedFormData.pregnancy_related = field.value as string;
        break;
      case "skin_body_markers": {
        const val = field.value as { adult_acne_oily_skin?: boolean; excess_body_facial_hair?: boolean };
        updatedFormData.adult_acne_oily_skin = val.adult_acne_oily_skin ?? null;
        updatedFormData.excess_body_facial_hair = val.excess_body_facial_hair ?? null;
        break;
      }
      case "smoking":
        updatedFormData.habits = {
          ...(updatedFormData.habits || DEFAULT_HABITS),
          smoking: Boolean(field.value),
        };
        break;
      case "alcohol":
        updatedFormData.habits = {
          ...(updatedFormData.habits || DEFAULT_HABITS),
          alcohol: Boolean(field.value),
        };
        break;
      case "hard_water":
        updatedFormData.habits = {
          ...(updatedFormData.habits || DEFAULT_HABITS),
          hard_water: Boolean(field.value),
        };
        break;
      case "hair_wash_frequency":
        updatedFormData.habits = {
          ...(updatedFormData.habits || DEFAULT_HABITS),
          hair_wash_frequency: field.value as string,
        };
        break;
      case "heating_tools_styling_chemicals":
        updatedFormData.habits = {
          ...(updatedFormData.habits || DEFAULT_HABITS),
          heating_tools_styling_chemicals: Boolean(field.value),
        };
        break;
      case "salon_treatments":
        updatedFormData.habits = {
          ...(updatedFormData.habits || DEFAULT_HABITS),
          salon_treatments: Boolean(field.value),
        };
        break;
      case "past_6_months":
        updatedFormData.past_6_months = field.value as string[];
        break;
      case "products":
        updatedFormData.products = field.value as IntakeFormData["products"];
        break;
      case "procedures":
        updatedFormData.procedures = field.value as IntakeFormData["procedures"];
        break;
      case "past_treatment_side_effects":
        updatedFormData.past_treatment_side_effects = Boolean(field.value);
        break;
      case "sample_type":
        updatedFormData.sample_type = field.value as string;
        break;
      case "consent":
        updatedFormData.consent = Boolean(field.value);
        break;
    }
  }

  const genderInf = state.pendingCascade?.genderInference;
  const newMessages = [...state.messages];

  newMessages.push({
    id: `msg_cascade_confirmed_${Date.now()}`,
    sender: "bot",
    content: "✓ Auto-filled answers confirmed.",
    timestamp: Date.now(),
    isTransition: true,
  });

  if (
    genderInf &&
    genderInf.inferred_gender !== "unknown" &&
    genderInf.confidence >= 0.7 &&
    !state.inferredSex
  ) {
    const cueText = genderInf.cues ? `${genderInf.cues}` : "linguistic cues in your voice note";
    newMessages.push({
      id: `msg_gender_prompt_${Date.now() + 1}`,
      sender: "bot",
      content: `I noticed you mentioned ${cueText} — I'll personalize your upcoming health checks accordingly. Sound right?`,
      timestamp: Date.now() + 1,
    });

    return {
      ...state,
      phase: "gender_confirm",
      formData: updatedFormData,
      answeredQuestionIds: updatedAnsweredIds,
      messages: newMessages,
      pendingCascade: {
        fields: fieldsToApply,
        genderInference: genderInf,
        status: "confirmed",
      },
    };
  }

  return advanceAfterCascade({
    ...state,
    formData: updatedFormData,
    answeredQuestionIds: updatedAnsweredIds,
    messages: newMessages,
  });
}

export function confirmGenderInference(
  state: EngineState,
  confirmed: boolean
): EngineState {
  const genderInf = state.pendingCascade?.genderInference;
  const newMessages = [...state.messages];
  const updatedFormData = { ...state.formData };
  const updatedAnsweredIds = [...state.answeredQuestionIds];

  if (confirmed && genderInf?.inferred_gender === "male") {
    updatedFormData.menstrual_cycle = "Not applicable";
    updatedFormData.pregnancy_related = "Not applicable";
    if (!updatedAnsweredIds.includes("q6_q7_hormonal")) {
      updatedAnsweredIds.push("q6_q7_hormonal");
    }
    if (!updatedAnsweredIds.includes("q_biological_sex")) {
      updatedAnsweredIds.push("q_biological_sex");
    }

    newMessages.push({
      id: `msg_gender_user_${Date.now()}`,
      sender: "user",
      content: "✓ That's right",
      timestamp: Date.now(),
    });

    return advanceAfterCascade({
      ...state,
      inferredSex: "male",
      formData: updatedFormData,
      answeredQuestionIds: updatedAnsweredIds,
      messages: newMessages,
    });
  } else if (confirmed && genderInf?.inferred_gender === "female") {
    if (!updatedAnsweredIds.includes("q_biological_sex")) {
      updatedAnsweredIds.push("q_biological_sex");
    }

    newMessages.push({
      id: `msg_gender_user_${Date.now()}`,
      sender: "user",
      content: "✓ That's right",
      timestamp: Date.now(),
    });

    return advanceAfterCascade({
      ...state,
      inferredSex: "female",
      formData: updatedFormData,
      answeredQuestionIds: updatedAnsweredIds,
      messages: newMessages,
    });
  } else {
    if (!updatedAnsweredIds.includes("q_biological_sex")) {
      updatedAnsweredIds.push("q_biological_sex");
    }

    newMessages.push({
      id: `msg_gender_user_${Date.now()}`,
      sender: "user",
      content: "✗ No, keep standard check-in",
      timestamp: Date.now(),
    });

    return advanceAfterCascade({
      ...state,
      inferredSex: null,
      formData: updatedFormData,
      answeredQuestionIds: updatedAnsweredIds,
      messages: newMessages,
    });
  }
}

export function advanceAfterCascade(state: EngineState): EngineState {
  const newMessages = [...state.messages];
  const updatedFormData = { ...state.formData };
  const updatedAnsweredIds = [...state.answeredQuestionIds];

  if (state.inferredSex === "male") {
    updatedFormData.menstrual_cycle = "Not applicable";
    updatedFormData.pregnancy_related = "Not applicable";
    if (!updatedAnsweredIds.includes("q6_q7_hormonal")) {
      updatedAnsweredIds.push("q6_q7_hormonal");
    }
    if (!updatedAnsweredIds.includes("q_biological_sex")) {
      updatedAnsweredIds.push("q_biological_sex");
    }
  } else if (state.inferredSex === "female") {
    if (!updatedAnsweredIds.includes("q_biological_sex")) {
      updatedAnsweredIds.push("q_biological_sex");
    }
  }

  const workingState: EngineState = {
    ...state,
    formData: updatedFormData,
    answeredQuestionIds: updatedAnsweredIds,
  };

  // Find first unanswered step in question order
  const nextStepId = FLOW_QUESTION_ORDER.find(
    (stepId) => !isQuestionAnswered(stepId, workingState)
  );

  if (!nextStepId) {
    newMessages.push({
      id: `msg_all_filled_${Date.now()}`,
      sender: "bot",
      content:
        "✓ Everything filled from your voice note! Review your summary below before your consultation.",
      timestamp: Date.now(),
      isTransition: true,
    });

    return {
      ...workingState,
      phase: "review",
      currentStepId: null,
      messages: newMessages,
    };
  }

  newMessages.push({
    id: `msg_trans_cascade_${Date.now()}`,
    sender: "bot",
    content: "Great, let me ask about a few more things to complete your clinical profile.",
    timestamp: Date.now(),
    isTransition: true,
  });

  const nextQ = getCurrentQuestion(
    { ...workingState, phase: "in_progress", currentStepId: nextStepId },
    ALL_QUESTIONS
  );

  if (nextQ) {
    newMessages.push({
      id: `msg_q_${nextQ.id}_${Date.now() + 1}`,
      sender: "bot",
      content: nextQ.prompt,
      timestamp: Date.now() + 1,
      questionId: nextQ.id,
    });
  }

  const stepIndex = (FLOW_QUESTION_ORDER as readonly string[]).indexOf(nextStepId);

  return {
    ...workingState,
    phase: "in_progress",
    currentStepId: nextStepId,
    currentQuestionIndex: Math.max(0, stepIndex),
    messages: newMessages,
  };
}

export function updateCascadeField(
  state: EngineState,
  keyOrQuestionId: string,
  newValue: unknown,
  newDisplayValue?: string
): EngineState {
  if (!state.pendingCascade) return state;

  const updatedFields = state.pendingCascade.fields.map((f) => {
    if (f.key === keyOrQuestionId || f.questionId === keyOrQuestionId) {
      return {
        ...f,
        value: newValue,
        displayValue: newDisplayValue || String(newValue),
      };
    }
    return f;
  });

  return {
    ...state,
    pendingCascade: {
      ...state.pendingCascade,
      fields: updatedFields,
    },
  };
}
