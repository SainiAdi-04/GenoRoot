export type QuestionType =
  | "number"
  | "single"
  | "multi"
  | "yesno"
  | "text"
  | "combined_yesno"
  | "hormonal";

export interface QuestionOption {
  label: string;
  value: string;
  emoji?: string;
  description?: string;
  isExclusive?: boolean; // e.g. "None of these", "No known family history"
}

export interface QuestionConfig {
  id: string; // e.g. "q1", "q2", "q11_smoking"
  n: number;
  key: string;
  sectionId: "A" | "B" | "C" | "D" | "E";
  sectionTitle: string;
  type: QuestionType;
  prompt: string;
  helperText?: string;
  options?: QuestionOption[];
  femaleOnly?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  unit?: string;
  voiceEligible?: boolean;
}

export interface IntakeFormData {
  // Section A - Personal & Family Hair Loss History
  age_hair_loss_began?: number | null;
  duration?: "Less than 6 months" | "6-12 months" | "Over a year" | string | null;
  family_history?: string[] | null;
  pattern?: string[] | null;

  // Section B - Hormonal & Health Influences
  diagnosed_conditions?: string[] | null;
  menstrual_cycle?: "Regular" | "Irregular" | "Menopausal" | "Not applicable" | string | null;
  pregnancy_related?: "Currently pregnant" | "Postpartum <1 year" | "Not applicable" | string | null;
  adult_acne_oily_skin?: boolean | null;
  excess_body_facial_hair?: boolean | null;

  // Section C - Lifestyle & Environmental Triggers
  past_6_months?: string[] | null;
  habits?: {
    smoking: boolean;
    smoking_severity?: "Mild <5/day" | "Moderate 5-10/day" | "Severe >10/day" | null;
    alcohol: boolean;
    hard_water: boolean;
    hair_wash_frequency: "Daily" | "Alternate Days" | "Weekly" | string;
    heating_tools_styling_chemicals: boolean;
    salon_treatments: boolean;
    salon_treatment_detail?: string | null;
  } | null;

  // Section D - Current Hair Care & Treatments
  products?: Array<{
    name: string;
    used: boolean;
    duration?: "<3mo" | "3-6mo" | ">6mo" | string | null;
    helped?: boolean | null;
    side_effects?: boolean | null;
  }> | null;
  procedures?: Array<{
    name: string;
    done: boolean;
    sessions?: "1-3" | "4-6" | ">6" | string | null;
    helped?: boolean | null;
  }> | null;
  past_treatment_side_effects?: boolean | null;
  past_treatment_side_effects_describe?: string | null;

  // Section E - Sample Collection & Consent
  sample_type?: "Saliva" | "Blood" | "Either" | string | null;
  consent?: boolean | null;
}

export type MessageSender = "bot" | "user" | "system";

export interface VoiceMetadata {
  audioUrl?: string;
  durationSeconds?: number;
  codemixTranscript?: string;
  translateTranscript?: string;
  isFallback?: boolean;
}

export interface VoiceInputPayload {
  audioUrl?: string;
  durationSeconds: number;
  codemix: string;
  translate: string;
  isFallback?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  content: string;
  timestamp: number;
  questionId?: string;
  isTransition?: boolean;
  voice?: VoiceMetadata;
  metadata?: Record<string, unknown>;
}

export type FlowPhase = "welcome" | "in_progress" | "review" | "completed";

export interface EngineState {
  phase: FlowPhase;
  currentStepId: string | null;
  currentQuestionIndex: number;
  answeredQuestionIds: string[];
  formData: IntakeFormData;
  messages: ChatMessage[];
  inferredSex?: "male" | "female" | null;
  editingStepId?: string | null;
}
