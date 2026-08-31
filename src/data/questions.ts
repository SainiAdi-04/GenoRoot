import { QuestionConfig } from "@/types/schema";

export const SECTION_A_QUESTIONS: QuestionConfig[] = [
  {
    id: "q1",
    n: 1,
    key: "age_hair_loss_began",
    sectionId: "A",
    sectionTitle: "Personal & Family Hair Loss History",
    type: "number",
    prompt: "Roughly how old were you when you first noticed changes in your hair?",
    helperText: "An approximate age is completely fine (e.g. 24).",
    min: 10,
    max: 99,
    placeholder: "e.g. 24",
    unit: "years old",
  },
  {
    id: "q2",
    n: 2,
    key: "duration",
    sectionId: "A",
    sectionTitle: "Personal & Family Hair Loss History",
    type: "single",
    prompt: "How long has this current phase been going on?",
    helperText: "Timeline helps us distinguish acute shedding from gradual thinning.",
    options: [
      { label: "Less than 6 months", value: "Less than 6 months" },
      { label: "6–12 months", value: "6-12 months" },
      { label: "Over a year", value: "Over a year" },
    ],
  },
  {
    id: "q3",
    n: 3,
    key: "family_history",
    sectionId: "A",
    sectionTitle: "Personal & Family Hair Loss History",
    type: "multi",
    prompt: "Hair genetics can come from either side. Any close relatives with hair loss or thinning?",
    helperText: "Select all that apply, or tap 'No known family history'.",
    options: [
      { label: "Father had hair loss", value: "Father had hair loss" },
      { label: "Mother had hair loss", value: "Mother had hair loss" },
      { label: "Siblings with thinning/baldness", value: "Siblings with thinning or baldness" },
      { label: "No known family history", value: "No known family history", isExclusive: true },
    ],
  },
  {
    id: "q4",
    n: 4,
    key: "pattern",
    sectionId: "A",
    sectionTitle: "Personal & Family Hair Loss History",
    type: "multi",
    prompt: "Which of these matches what you're noticing on your scalp?",
    helperText: "You can choose more than one pattern if applicable.",
    options: [
      { label: "Receding hairline", value: "Receding hairline", emoji: "📐" },
      { label: "Thinning at crown", value: "Thinning at crown", emoji: "👑" },
      { label: "Widening part line", value: "Widening part line", emoji: "〰️" },
      { label: "Diffuse thinning (overall density drop)", value: "Diffuse thinning", emoji: "🌧️" },
      { label: "Patchy loss", value: "Patchy loss", emoji: "⭕" },
      { label: "Sudden excessive shedding", value: "Sudden excessive shedding", emoji: "⚡" },
    ],
  },
];

export const ALL_QUESTIONS: QuestionConfig[] = [...SECTION_A_QUESTIONS];

export const WELCOME_MESSAGE = {
  text: "Hi! 👋 I'm here to help your doctor prepare for your consultation. You can tell me about your hair in your own words, or we'll go through it step by step.",
  buttons: [
    { id: "voice", label: "🎙️ Record voice note", disabled: true, note: "Coming in next phase" },
    { id: "step-by-step", label: "➡️ Let's go step by step", disabled: false },
  ],
};
