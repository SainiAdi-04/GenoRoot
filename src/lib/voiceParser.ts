import { QuestionConfig } from "@/types/schema";

export interface ParseVoiceResult<T = unknown> {
  success: boolean;
  value?: T;
  rawText: string;
  confidence?: number;
  reason?: string;
}

const ENGLISH_UNITS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const ENGLISH_TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

// Common Hindi / Hinglish age words (10 to 70)
const HINDI_NUMBERS: Record<string, number> = {
  das: 10,
  dus: 10,
  gyarah: 11,
  barah: 12,
  terah: 13,
  chaudah: 14,
  pandrah: 15,
  solah: 16,
  satrah: 17,
  atharah: 18,
  unnees: 19,
  unis: 19,
  bees: 20,
  bis: 20,
  ikkees: 21,
  ikkis: 21,
  baees: 22,
  bais: 22,
  teees: 23,
  teis: 23,
  chaubees: 24,
  chobis: 24,
  pachees: 25,
  pachis: 25,
  chhabis: 26,
  chhabbis: 26,
  sattaees: 27,
  satais: 27,
  atthais: 28,
  athais: 28,
  untees: 29,
  unnattees: 29,
  tees: 30,
  iktees: 31,
  iktis: 31,
  battees: 32,
  battis: 32,
  tentees: 33,
  tentis: 33,
  chauntees: 34,
  chauntis: 34,
  pantees: 35,
  paintis: 35,
  chhattees: 36,
  chhattis: 36,
  saintees: 37,
  saintis: 37,
  adhtees: 38,
  adhtis: 38,
  untalees: 39,
  untalis: 39,
  chalis: 40,
  iktalis: 41,
  bayalees: 42,
  taintalis: 43,
  chavalees: 44,
  paintalis: 45,
  chhiyalees: 46,
  saintalis: 47,
  adhtalis: 48,
  unchas: 49,
  pachas: 50,
  ikawan: 51,
  bawan: 52,
  tirpan: 53,
  chauwan: 54,
  pachpan: 55,
  chhappan: 56,
  sattavan: 57,
  atthawan: 58,
  unsath: 59,
  saath: 60,
  sath: 60,
  painsath: 65,
  sattar: 70,
};

function parseEnglishWordsToNumber(text: string): number | null {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (let i = 0; i < words.length; i++) {
    const currentWord = words[i];

    // Check Hindi numbers first
    if (HINDI_NUMBERS[currentWord] !== undefined) {
      return HINDI_NUMBERS[currentWord];
    }

    // Check compound tens + units: e.g. "twenty eight"
    if (ENGLISH_TENS[currentWord] !== undefined) {
      const tensValue = ENGLISH_TENS[currentWord];
      const nextWord = words[i + 1];
      if (nextWord && ENGLISH_UNITS[nextWord] !== undefined && ENGLISH_UNITS[nextWord] < 10) {
        return tensValue + ENGLISH_UNITS[nextWord];
      }
      return tensValue;
    }

    // Check single unit: e.g. "eighteen"
    if (ENGLISH_UNITS[currentWord] !== undefined && ENGLISH_UNITS[currentWord] >= 10) {
      return ENGLISH_UNITS[currentWord];
    }
  }

  return null;
}

function extractNumber(
  text: string,
  min?: number,
  max?: number
): { parsedNumber: number | null; error?: string } {
  // 1. Direct digits
  const digitMatch = text.match(/\b\d{1,3}\b/);
  if (digitMatch) {
    const digitValue = parseInt(digitMatch[0], 10);
    if (min !== undefined && digitValue < min) {
      return { parsedNumber: null, error: `Value ${digitValue} is below minimum allowed (${min})` };
    }
    if (max !== undefined && digitValue > max) {
      return { parsedNumber: null, error: `Value ${digitValue} exceeds maximum allowed (${max})` };
    }
    return { parsedNumber: digitValue };
  }

  // 2. English / Hindi word numbers
  const wordNumber = parseEnglishWordsToNumber(text);
  if (wordNumber !== null) {
    if (min !== undefined && wordNumber < min) {
      return { parsedNumber: null, error: `Value ${wordNumber} is below minimum allowed (${min})` };
    }
    if (max !== undefined && wordNumber > max) {
      return { parsedNumber: null, error: `Value ${wordNumber} exceeds maximum allowed (${max})` };
    }
    return { parsedNumber: wordNumber };
  }

  return { parsedNumber: null, error: "No recognizable number found in transcript" };
}

export function parseVoiceTranscript(
  stepId: string,
  question: QuestionConfig,
  transcript: string
): ParseVoiceResult {
  const cleanTranscript = (transcript || "").trim();

  if (!cleanTranscript) {
    return {
      success: false,
      rawText: cleanTranscript,
      reason: "Voice transcript was empty",
    };
  }

  // Number input questions (e.g. Q1 age)
  if (question.type === "number") {
    const { parsedNumber, error } = extractNumber(cleanTranscript, question.min, question.max);
    if (parsedNumber !== null) {
      return {
        success: true,
        value: parsedNumber,
        rawText: cleanTranscript,
        confidence: 0.95,
      };
    }
    return {
      success: false,
      rawText: cleanTranscript,
      reason: error || "Could not parse number from voice",
    };
  }

  // Free text questions (e.g. Q11 salon detail, Q14 side effects describe)
  if (question.type === "text") {
    return {
      success: true,
      value: cleanTranscript,
      rawText: cleanTranscript,
      confidence: 0.9,
    };
  }

  return {
    success: false,
    rawText: cleanTranscript,
    reason: "Question is not voice-enabled for auto-extraction. Please enter manually.",
  };
}
