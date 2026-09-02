import { QuestionConfig } from "@/types/schema";
import { resolveBrandMentions } from "./brandResolver";

export interface ParseVoiceResult<T = unknown> {
  success: boolean;
  value?: T;
  rawText: string;
  confidence?: number;
  reason?: string;
  confirmationPhrase?: string;
  displayBadges?: string[];
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

    if (HINDI_NUMBERS[currentWord] !== undefined) {
      return HINDI_NUMBERS[currentWord];
    }

    if (ENGLISH_TENS[currentWord] !== undefined) {
      const tensValue = ENGLISH_TENS[currentWord];
      const nextWord = words[i + 1];
      if (nextWord && ENGLISH_UNITS[nextWord] !== undefined && ENGLISH_UNITS[nextWord] < 10) {
        return tensValue + ENGLISH_UNITS[nextWord];
      }
      return tensValue;
    }

    if (ENGLISH_UNITS[currentWord] !== undefined && ENGLISH_UNITS[currentWord] >= 10) {
      return ENGLISH_UNITS[currentWord];
    }
  }

  return null;
}

export function normalizeDevanagariDigits(str: string): string {
  const devanagariDigits = "०१२३४५६७८९";
  return str.replace(/[०-९]/g, (char) => `${devanagariDigits.indexOf(char)}`);
}

export function extractNumber(
  text: string,
  min?: number,
  max?: number
): { parsedNumber: number | null; error?: string } {
  const normalized = normalizeDevanagariDigits(text);

  // 1. Direct digits
  const digitMatch = normalized.match(/\b\d{1,3}\b/);
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
  const wordNumber = parseEnglishWordsToNumber(normalized);
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

// ---------------------------------------------------------
// Keyword Bags (Strict ASR + Deterministic Trie/Regex matchers)
// ---------------------------------------------------------

// Screen 3: Biological Sex
function extractSex(text: string): string | null {
  const t = text.toLowerCase();
  if (/\b(prefer\s*not|skip|pass|private|none)\b/.test(t) || /छोड़|नहीं\s*बताना|गुप्त/.test(t)) return "prefer_not_to_say";
  if (/\b(female|woman|lady|girl|aurat|ladki|mahila)\b/.test(t) || /महिला|औरत|लड़की|फीमेल|स्त्री/.test(t)) return "female";
  if (/\b(male|man|guy|boy|gentleman|mard|ladka)\b/.test(t) || /पुरुष|मर्द|लड़का|आदमी|मेल/.test(t)) return "male";
  return null;
}

// Screen 5: Duration
function extractDuration(text: string): string | null {
  const normalized = normalizeDevanagariDigits(text);
  const t = normalized.toLowerCase();

  // 1. Check for explicit months count (e.g. "6 months", "6 mahine", "लगभग 6 महीनों", "3 mahine", "8 months")
  const monthRegex = /(\b\d{1,2}\b|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|ek|do|teen|chaar|char|paanch|panch|chhe|che|saat|aath|ath|nau|das|gyarah|barah|एक|दो|तीन|चार|पांच|छह|सात|आठ|नौ|दस)\s*(months?|mahine?|mahino?|महीने|महीनों)/i;
  const monthMatch = t.match(monthRegex);
  if (monthMatch) {
    const rawNum = monthMatch[1].toLowerCase();
    let numVal: number | null = null;
    if (/^\d+$/.test(rawNum)) {
      numVal = parseInt(rawNum, 10);
    } else {
      const wordMap: Record<string, number> = {
        one: 1, ek: 1, "एक": 1,
        two: 2, do: 2, "दो": 2,
        three: 3, teen: 3, "तीन": 3,
        four: 4, chaar: 4, char: 4, "चार": 4,
        five: 5, paanch: 5, panch: 5, "पांच": 5,
        six: 6, chhe: 6, che: 6, "छह": 6,
        seven: 7, saat: 7, "सात": 7,
        eight: 8, aath: 8, ath: 8, "आठ": 8,
        nine: 9, nau: 9, "नौ": 9,
        ten: 10, das: 10, "दस": 10,
        eleven: 11, gyarah: 11,
        twelve: 12, barah: 12,
      };
      numVal = wordMap[rawNum] ?? null;
    }

    if (numVal !== null) {
      const isLess = /less|under|कम|kam/.test(t);
      if (numVal === 6 && isLess) {
        return "Less than 6 months";
      }
      if (numVal < 6) {
        return "Less than 6 months";
      } else if (numVal <= 12) {
        return "6-12 months";
      } else {
        return "Over a year";
      }
    }
  }

  // 2. Check for explicit years count (e.g. "1 year", "2 saal", "2 साल", "several years")
  const yearRegex = /(\b\d{1,2}\b|one|two|three|four|five|ek|do|teen|chaar|char|paanch|एक|दो|तीन|चार)\s*(years?|saal|साल|saalon)/i;
  const yearMatch = t.match(yearRegex);
  if (yearMatch) {
    const rawNum = yearMatch[1].toLowerCase();
    const yrVal = /^\d+$/.test(rawNum) ? parseInt(rawNum, 10) : 1;
    if (yrVal >= 1) {
      if (t.includes("less than a year") || t.includes("saal se kam") || t.includes("साल से कम")) {
        return "6-12 months";
      }
      return "Over a year";
    }
  }

  // 3. Fallback keywords
  if (
    /\b(less\s*than|under|<|fewer|chhe\s*mahine\s*se\s*kam|kuch\s*mahine|recent|acute)\b/.test(t) ||
    /\b(less\s*than\s*6|under\s*6)\b/.test(t) ||
    /कम|हाल|कुछ\s*महीने|महीने\s*से\s*कम/.test(t)
  ) {
    return "Less than 6 months";
  }
  if (
    /\b(6\s*to\s*12|six\s*to\s*twelve|6-12|half\s*a\s*year|around\s*a\s*year|almost\s*a\s*year|aadha\s*saal)\b/.test(t) ||
    /6\s*से\s*12|आधा\s*साल|लगभग\s*एक\s*साल|छह\s*महीने/.test(t)
  ) {
    return "6-12 months";
  }
  if (
    /\b(over|more\s*than|years|several\s*years|ek\s*saal\s*se\s*(zyada|jyada)|chronic|long\s*time|saalon\s*se)\b/.test(t) ||
    /\b(over\s*a\s*year)\b/.test(t) ||
    /एक\s*साल\s*से\s*ज्यादा|साल\s*से\s*ज्यादा|काफी\s*समय|सालों\s*से|बहुत\s*समय/.test(t)
  ) {
    return "Over a year";
  }

  return null;
}

// Screen 6: Family History (Multi-select)
export const FAMILY_KEYWORD_MAP: Record<string, string> = {
  // Paternal / Father
  father: "Father had hair loss",
  dad: "Father had hair loss",
  daddy: "Father had hair loss",
  papa: "Father had hair loss",
  pitaji: "Father had hair loss",
  paternal: "Father had hair loss",
  babuji: "Father had hair loss",
  bapu: "Father had hair loss",
  abba: "Father had hair loss",
  abbu: "Father had hair loss",
  dada: "Father had hair loss",
  dadaji: "Father had hair loss",
  grandfather: "Father had hair loss",
  grandpa: "Father had hair loss",
  chacha: "Father had hair loss",
  tauji: "Father had hair loss",
  "डैड": "Father had hair loss",
  "डैडी": "Father had hair loss",
  "फादर": "Father had hair loss",
  "पिता": "Father had hair loss",
  "पापा": "Father had hair loss",
  "पिताजी": "Father had hair loss",
  "बाबूजी": "Father had hair loss",
  "बापू": "Father had hair loss",
  "अब्बा": "Father had hair loss",
  "अब्बू": "Father had hair loss",
  "दादा": "Father had hair loss",
  "दादाजी": "Father had hair loss",
  "चाचा": "Father had hair loss",
  "ताऊ": "Father had hair loss",
  // Common ASR phonetic misrecognition: 'mere dad' spoken in Hindi often transcribed as 'मुझे दर्द' or 'दर्द'
  "दर्द": "Father had hair loss",
  "दाद": "Father had hair loss",

  // Maternal / Mother
  mother: "Mother had hair loss",
  mom: "Mother had hair loss",
  mommy: "Mother had hair loss",
  mummy: "Mother had hair loss",
  mataji: "Mother had hair loss",
  maternal: "Mother had hair loss",
  ammi: "Mother had hair loss",
  amma: "Mother had hair loss",
  nana: "Mother had hair loss",
  nanaji: "Mother had hair loss",
  nani: "Mother had hair loss",
  naniji: "Mother had hair loss",
  grandmother: "Mother had hair loss",
  grandma: "Mother had hair loss",
  mausi: "Mother had hair loss",
  masi: "Mother had hair loss",
  mami: "Mother had hair loss",
  bua: "Mother had hair loss",
  "मॉम": "Mother had hair loss",
  "मॉमी": "Mother had hair loss",
  "माता": "Mother had hair loss",
  "माताजी": "Mother had hair loss",
  "माँ": "Mother had hair loss",
  "मम्मी": "Mother had hair loss",
  "अम्मी": "Mother had hair loss",
  "अम्मा": "Mother had hair loss",
  "नाना": "Mother had hair loss",
  "नानाजी": "Mother had hair loss",
  "नानी": "Mother had hair loss",
  "नानीजी": "Mother had hair loss",
  "मौसी": "Mother had hair loss",
  "मासी": "Mother had hair loss",
  "मामी": "Mother had hair loss",
  "बुआ": "Mother had hair loss",

  // Siblings
  brother: "Siblings with thinning or baldness",
  sister: "Siblings with thinning or baldness",
  sibling: "Siblings with thinning or baldness",
  siblings: "Siblings with thinning or baldness",
  bhai: "Siblings with thinning or baldness",
  bhaiya: "Siblings with thinning or baldness",
  behan: "Siblings with thinning or baldness",
  behna: "Siblings with thinning or baldness",
  didi: "Siblings with thinning or baldness",
  jiji: "Siblings with thinning or baldness",
  bro: "Siblings with thinning or baldness",
  sis: "Siblings with thinning or baldness",
  cousin: "Siblings with thinning or baldness",
  "भाई": "Siblings with thinning or baldness",
  "भैया": "Siblings with thinning or baldness",
  "बहन": "Siblings with thinning or baldness",
  "बहना": "Siblings with thinning or baldness",
  "दीदी": "Siblings with thinning or baldness",
  "जीजी": "Siblings with thinning or baldness",
  "कजिन": "Siblings with thinning or baldness",
  "भाई-बहन": "Siblings with thinning or baldness",

  // No known family history
  none: "No known family history",
  "no one": "No known family history",
  nobody: "No known family history",
  neither: "No known family history",
  "koi nahi": "No known family history",
  "no family": "No known family history",
  "kisi ko nahi": "No known family history",
  "kisi ko bhi nahi": "No known family history",
  "not in family": "No known family history",
  "nobody in family": "No known family history",
  "कोई नहीं": "No known family history",
  "किसी को नहीं": "No known family history",
  "किसी को भी नहीं": "No known family history",
  "परिवार में किसी को नहीं": "No known family history",
  "फैमिली में किसी को नहीं": "No known family history",
};

export function extractFamilyHistory(transcript: string): string[] {
  const words = transcript.toLowerCase();
  const matched = new Set<string>();

  for (const [key, value] of Object.entries(FAMILY_KEYWORD_MAP)) {
    const isDevanagari = /[\u0900-\u097F]/.test(key);
    if (isDevanagari) {
      if (words.includes(key)) {
        matched.add(value);
      }
    } else {
      const regex = new RegExp(`\\b${key}\\b`, "i");
      if (regex.test(words)) {
        matched.add(value);
      }
    }
  }

  // If 'none' was indicated, clear all others
  if (matched.has("No known family history")) {
    return ["No known family history"];
  }

  return Array.from(matched);
}

// Screen 7: Pattern (Multi-select)
const PATTERN_KEYWORD_MAP: Record<string, string> = {
  receding: "Receding hairline",
  hairline: "Receding hairline",
  temple: "Receding hairline",
  temples: "Receding hairline",
  forehead: "Receding hairline",
  "aage se": "Receding hairline",
  "samne se": "Receding hairline",
  "आगे से": "Receding hairline",
  "सामने से": "Receding hairline",

  crown: "Thinning at crown",
  vertex: "Thinning at crown",
  "top of head": "Thinning at crown",
  "top of scalp": "Thinning at crown",
  "bald spot": "Thinning at crown",
  "beech me": "Thinning at crown",
  choti: "Thinning at crown",
  "चोटी": "Thinning at crown",
  "चोरी": "Thinning at crown", // phonetic misrecognition of choti
  "क्राउन": "Thinning at crown",
  "बीच में": "Thinning at crown",
  "सिर के बीच": "Thinning at crown",

  "widening part": "Widening part line",
  "part line": "Widening part line",
  parting: "Widening part line",
  maang: "Widening part line",
  "मांग": "Widening part line",
  "मांग चौड़ी": "Widening part line",

  diffuse: "Diffuse thinning",
  "all over": "Diffuse thinning",
  everywhere: "Diffuse thinning",
  "poore sar": "Diffuse thinning",
  overall: "Diffuse thinning",
  "पूरे सिर": "Diffuse thinning",
  "हर जगह": "Diffuse thinning",

  patchy: "Patchy loss",
  patch: "Patchy loss",
  patches: "Patchy loss",
  coin: "Patchy loss",
  "alopecia areata": "Patchy loss",
  "सिक्के जैसा": "Patchy loss",

  sudden: "Sudden excessive shedding",
  shedding: "Sudden excessive shedding",
  clump: "Sudden excessive shedding",
  clumps: "Sudden excessive shedding",
  "falling out": "Sudden excessive shedding",
  "heavy fall": "Sudden excessive shedding",
  "बाल झड़ रहे": "Sudden excessive shedding",
  "झड़ रहे": "Sudden excessive shedding",
  "झड़ना": "Sudden excessive shedding",
  "गुच्छों में": "Sudden excessive shedding",
};

export function extractPattern(transcript: string): string[] {
  const words = transcript.toLowerCase();
  const matched = new Set<string>();

  for (const [key, value] of Object.entries(PATTERN_KEYWORD_MAP)) {
    if (words.includes(key)) {
      matched.add(value);
    }
  }

  return Array.from(matched);
}

// Screen 8: Diagnosed Conditions
const CONDITIONS_KEYWORD_MAP: Record<string, string> = {
  pcos: "PCOS/PCOD",
  pcod: "PCOS/PCOD",
  polycystic: "PCOS/PCOD",
  "पीसीओडी": "PCOS/PCOD",
  "पीसीओएस": "PCOS/PCOD",
  thyroid: "Thyroid disorder",
  hypothyroid: "Thyroid disorder",
  hyperthyroid: "Thyroid disorder",
  "थायराइड": "Thyroid disorder",
  "थायरॉइड": "Thyroid disorder",
  diabetes: "Diabetes",
  sugar: "Diabetes",
  diabetic: "Diabetes",
  "डायबिटीज": "Diabetes",
  "शुगर": "Diabetes",
  autoimmune: "Autoimmune disease",
  lupus: "Autoimmune disease",
  rheumatoid: "Autoimmune disease",
  anemia: "Anemia",
  anaemia: "Anemia",
  iron: "Anemia",
  ferritin: "Anemia",
  hemoglobin: "Anemia",
  "एनीमिया": "Anemia",
  none: "None",
  "no condition": "None",
  healthy: "None",
  "kuch nahi": "None",
  "no disease": "None",
  "कोई बीमारी नहीं": "None",
  "कुछ नहीं": "None",
  "स्वस्थ": "None",
};

export function extractConditions(transcript: string): string[] {
  const words = transcript.toLowerCase();
  const matched = new Set<string>();

  for (const [key, value] of Object.entries(CONDITIONS_KEYWORD_MAP)) {
    const isDevanagari = /[\u0900-\u097F]/.test(key);
    if (isDevanagari) {
      if (words.includes(key)) {
        matched.add(value);
      }
    } else {
      const regex = new RegExp(`\\b${key}\\b`, "i");
      if (regex.test(words)) {
        matched.add(value);
      }
    }
  }

  if (matched.has("None")) {
    return ["None"];
  }

  return Array.from(matched);
}

// Screen 8 (Female): Hormonal
function extractHormonal(transcript: string): string | null {
  const t = transcript.toLowerCase();
  if (/\b(postpartum|delivery|baby|lactating|feeding|childbirth)\b/.test(t)) {
    return "Postpartum <1 year";
  }
  if (/\b(pregnant|pregnancy|expecting)\b/.test(t)) {
    return "Currently pregnant";
  }
  if (/\b(menopause|menopausal|stopped periods)\b/.test(t)) {
    return "Menopausal";
  }
  if (/\b(irregular|delayed|missed|pcos cycle|fluctuating)\b/.test(t)) {
    return "Irregular";
  }
  if (/\b(regular|normal|on time|every month)\b/.test(t)) {
    return "Regular periods";
  }
  if (/\b(not applicable|na|n\/a|skip)\b/.test(t)) {
    return "Not applicable";
  }
  return null;
}

// Combined skin & body markers
function extractSkinBody(transcript: string): { adult_acne_oily_skin: boolean; excess_body_facial_hair: boolean } | null {
  const t = transcript.toLowerCase();
  const hasAcne = /\b(acne|pimples|oily|oiliness|greasy)\b/.test(t);
  const hasFacial = /\b(facial\s*hair|body\s*hair|hirsutism|chin\s*hair|upper\s*lip)\b/.test(t);
  const hasNeither = /\b(neither|none|no|neither\s*of\s*them|nothing|clear|clean)\b/.test(t);

  if (hasNeither && !hasAcne && !hasFacial) {
    return { adult_acne_oily_skin: false, excess_body_facial_hair: false };
  }

  if (hasAcne || hasFacial) {
    return {
      adult_acne_oily_skin: hasAcne,
      excess_body_facial_hair: hasFacial,
    };
  }

  return null;
}

// Screen 9: Lifestyle Triggers (Past 6 months)
const TRIGGERS_KEYWORD_MAP: Record<string, string> = {
  fever: "Severe illness / high fever (dengue, COVID, malaria, typhoid)",
  dengue: "Severe illness / high fever (dengue, COVID, malaria, typhoid)",
  covid: "Severe illness / high fever (dengue, COVID, malaria, typhoid)",
  malaria: "Severe illness / high fever (dengue, COVID, malaria, typhoid)",
  typhoid: "Severe illness / high fever (dengue, COVID, malaria, typhoid)",
  illness: "Severe illness / high fever (dengue, COVID, malaria, typhoid)",
  infection: "Severe illness / high fever (dengue, COVID, malaria, typhoid)",

  surgery: "Major surgery / rapid weight loss / strict diet",
  operation: "Major surgery / rapid weight loss / strict diet",
  weight: "Major surgery / rapid weight loss / strict diet",
  "weight loss": "Major surgery / rapid weight loss / strict diet",
  diet: "Major surgery / rapid weight loss / strict diet",
  dieting: "Major surgery / rapid weight loss / strict diet",

  stress: "Severe emotional stress / bereavement / job change",
  tension: "Severe emotional stress / bereavement / job change",
  grief: "Severe emotional stress / bereavement / job change",
  bereavement: "Severe emotional stress / bereavement / job change",
  "job change": "Severe emotional stress / bereavement / job change",

  medication: "Starting or stopping medications",
  medications: "Starting or stopping medications",
  medicine: "Starting or stopping medications",
  pills: "Starting or stopping medications",
  steroid: "Starting or stopping medications",

  none: "None of these",
  nothing: "None of these",
  "no trigger": "None of these",
  "kuch nahi": "None of these",
  "कोई नहीं": "None of these",
  "कुछ नहीं": "None of these",
  "डेंगू": "Severe illness / high fever (dengue, COVID, malaria, typhoid)",
  "बुखार": "Severe illness / high fever (dengue, COVID, malaria, typhoid)",
  "मलेरिया": "Severe illness / high fever (dengue, COVID, malaria, typhoid)",
  "टाइफाइड": "Severe illness / high fever (dengue, COVID, malaria, typhoid)",
  "सर्जरी": "Major surgery / rapid weight loss / strict diet",
  "ऑपरेशन": "Major surgery / rapid weight loss / strict diet",
  "तनाव": "Severe emotional stress / bereavement / job change",
  "दवा": "Starting or stopping medications",
  "दवाइयां": "Starting or stopping medications",
};

export function extractTriggers(transcript: string): string[] {
  const words = transcript.toLowerCase();
  const matched = new Set<string>();

  for (const [key, value] of Object.entries(TRIGGERS_KEYWORD_MAP)) {
    const isDevanagari = /[\u0900-\u097F]/.test(key);
    if (isDevanagari) {
      if (words.includes(key)) {
        matched.add(value);
      }
    } else {
      const regex = new RegExp(`\\b${key}\\b`, "i");
      if (regex.test(words)) {
        matched.add(value);
      }
    }
  }

  if (matched.has("None of these")) {
    return ["None of these"];
  }

  return Array.from(matched);
}

// Simple Yes/No Extractor
function extractYesNo(transcript: string): boolean | null {
  const t = transcript.toLowerCase();
  if (/\b(no|never|don't|not|nahi|nope|nah|false)\b/.test(t) || /नहीं|ना|जी नहीं|बिल्कुल नहीं/.test(t)) return false;
  if (/\b(yes|yeah|yep|ha|haan|sure|correct|true|always|sometimes|often)\b/.test(t) || /हाँ|हां|जी हाँ|जी हां|बिल्कुल|सही|हाँजी/.test(t)) return true;
  return null;
}

// Smoking severity
function extractSmoking(transcript: string): string | null {
  const t = transcript.toLowerCase();
  if (/\b(no|never|non\s*smoker|don't\s*smoke|nahi)\b/.test(t) || /नहीं पीता|सिगरेट नहीं|नशा नहीं|नहीं/.test(t)) return "No";
  if (/\b(mild|under\s*5|less\s*than\s*5|<5|1|2|3|4|occasionally|few)\b/.test(t)) return "Mild <5/day";
  if (/\b(moderate|5\s*to\s*10|5-10|around\s*5|6|7|8|9|10)\b/.test(t) || /5-6|दिन में 5|पीता हूँ/.test(t)) return "Moderate 5-10/day";
  if (/\b(severe|more\s*than\s*10|>10|heavy|pack|chain|pack\s*a\s*day)\b/.test(t) || /बहुत ज्यादा|10 से ज्यादा/.test(t)) return "Severe >10/day";
  if (extractYesNo(transcript) === true) return "Mild <5/day";
  return null;
}

// Hair wash frequency
function extractWashFreq(transcript: string): string | null {
  const t = transcript.toLowerCase();
  if (/\b(daily|every\s*day|roz|har\s*din)\b/.test(t) || /रोज|हर दिन|प्रतिदिन/.test(t)) return "Daily";
  if (/\b(alternate|every\s*other\s*day|2-3|twice|thrice|ek\s*din\s*chhod\s*ke)\b/.test(t) || /एक दिन छोड़ कर|हफ्ते में दो|हफ्ते में तीन/.test(t)) return "Alternate Days";
  if (/\b(weekly|once\s*a\s*week|hafta)\b/.test(t) || /हफ्ते में एक|साप्ताहिक/.test(t)) return "Weekly";
  return null;
}

// Sample type
function extractSampleType(transcript: string): string | null {
  const t = transcript.toLowerCase();
  if (/\b(either|both|any|koi\s*bhi)\b/.test(t)) return "Either";
  if (/\b(saliva|spit|oral)\b/.test(t)) return "Saliva";
  if (/\b(blood|test)\b/.test(t)) return "Blood";
  return null;
}

// Products Keyword Matcher
export function extractProductsTried(transcript: string): string[] {
  const t = transcript.toLowerCase();
  if (/\b(none|nothing|never|no\s*products|kuch\s*nahi)\b/.test(t)) {
    return ["None"];
  }

  const mentions = resolveBrandMentions(transcript);
  const matched = new Set<string>(mentions);

  if (/\b(shampoo|scalpe|ketoconazole|candid|selsun)\b/.test(t)) {
    matched.add("OTC/Medicated Shampoos");
  }
  if (/\b(oil|serum|redensyl|procapil|rosemary|bontress)\b/.test(t)) {
    matched.add("Hair Oils/Serums");
  }
  if (/\b(minoxidil|mintop|tugain|morr|regaine)\b/.test(t)) {
    matched.add("Topical Minoxidil");
  }
  if (/\b(supplement|supplements|biotin|follihair|keraglo|multivitamin)\b/.test(t)) {
    matched.add("Supplements");
  }
  if (/\b(finasteride|finax|oral\s*minoxidil)\b/.test(t)) {
    matched.add("Oral Minoxidil");
  }

  return Array.from(matched);
}

// ---------------------------------------------------------
// Confirmation phrase generator (The Golden Rule: Always confirm what you heard)
// ---------------------------------------------------------
export function getConfirmationDetails(
  stepId: string,
  value: unknown
): { confirmationPhrase: string; displayBadges: string[] } {
  switch (stepId) {
    case "q1":
      return {
        confirmationPhrase: `You said ${value} years old. Correct?`,
        displayBadges: [`${value} years old`],
      };
    case "q_biological_sex": {
      const label = value === "male" ? "Male" : value === "female" ? "Female" : "Prefer not to say";
      return {
        confirmationPhrase: `Got it, ${label}. Is that right?`,
        displayBadges: [label],
      };
    }
    case "q2":
      return {
        confirmationPhrase: `${value}, noted. Is that right?`,
        displayBadges: [String(value)],
      };
    case "q3": {
      const arr = Array.isArray(value) ? value : [String(value)];
      const shortLabels = arr.map((item) =>
        item.includes("Father")
          ? "Father"
          : item.includes("Mother")
          ? "Mother"
          : item.includes("Siblings")
          ? "Siblings"
          : "None"
      );
      const phrase =
        shortLabels.length === 1 && shortLabels[0] === "None"
          ? "I heard no family history. Is that correct?"
          : `I heard ${shortLabels.join(" and ")}. Is that correct?`;
      return {
        confirmationPhrase: phrase,
        displayBadges: shortLabels,
      };
    }
    case "q4": {
      const arr = Array.isArray(value) ? value : [String(value)];
      const phrase = `You said ${arr.join(" and ").toLowerCase()}. Right?`;
      return {
        confirmationPhrase: phrase,
        displayBadges: arr,
      };
    }
    case "q5": {
      const arr = Array.isArray(value) ? value : [String(value)];
      const phrase =
        arr.length === 1 && arr[0] === "None"
          ? "I heard no diagnosed conditions. Is that correct?"
          : `I heard ${arr.join(" and ")}. Is that correct?`;
      return {
        confirmationPhrase: phrase,
        displayBadges: arr,
      };
    }
    case "q6_q7_hormonal":
      return {
        confirmationPhrase: `Recorded ${value}. Is that right?`,
        displayBadges: [String(value)],
      };
    case "q8_q9_skin": {
      const val = value as { adult_acne_oily_skin?: boolean; excess_body_facial_hair?: boolean };
      const badges: string[] = [];
      if (val.adult_acne_oily_skin) badges.push("Adult acne / oily skin");
      if (val.excess_body_facial_hair) badges.push("Excess body/facial hair");
      if (badges.length === 0) badges.push("Neither");
      return {
        confirmationPhrase: `Recorded ${badges.join(" and ")}. Is that right?`,
        displayBadges: badges,
      };
    }
    case "q11_smoking": {
      const badge = value === "No" ? "Non-smoker" : `Smoking: ${value}`;
      return {
        confirmationPhrase: `Recorded ${badge}. Is that right?`,
        displayBadges: [badge],
      };
    }
    case "q11_alcohol": {
      const isYes = value === "true" || value === true;
      return {
        confirmationPhrase: isYes ? "You consume alcohol. Correct?" : "No alcohol noted. Correct?",
        displayBadges: [isYes ? "Yes" : "No"],
      };
    }
    case "q11_hard_water": {
      const isYes = value === "true" || value === true;
      return {
        confirmationPhrase: isYes ? "Hard or borewell water noted. Correct?" : "Normal/soft water noted. Correct?",
        displayBadges: [isYes ? "Hard water" : "Normal water"],
      };
    }
    case "q11_hair_wash_frequency":
      return {
        confirmationPhrase: `Hair washing: ${value}. Right?`,
        displayBadges: [String(value)],
      };
    case "q11_heating_tools": {
      const isYes = value === "true" || value === true;
      return {
        confirmationPhrase: isYes ? "Heating tools used. Correct?" : "No heating tools. Correct?",
        displayBadges: [isYes ? "Yes" : "No"],
      };
    }
    case "q11_salon_treatments": {
      const isYes = value === "true" || value === true;
      return {
        confirmationPhrase: isYes ? "Salon treatments noted. Correct?" : "No salon treatments. Correct?",
        displayBadges: [isYes ? "Yes" : "No"],
      };
    }
    case "q10_past_6_months": {
      const arr = Array.isArray(value) ? value : [String(value)];
      const phrase =
        arr.length === 1 && arr[0] === "None of these"
          ? "No recent trigger events. Correct?"
          : `I heard: ${arr.join(", ")}. Is that right?`;
      return {
        confirmationPhrase: phrase,
        displayBadges: arr,
      };
    }
    case "q12_products_select": {
      const arr = Array.isArray(value) ? value : [String(value)];
      const phrase =
        arr.length === 1 && arr[0] === "None"
          ? "No past medical products tried. Correct?"
          : `I heard: ${arr.join(", ")}. Is that right?`;
      return {
        confirmationPhrase: phrase,
        displayBadges: arr,
      };
    }
    case "q13_procedures_gate": {
      const isYes = value === "true" || value === true;
      return {
        confirmationPhrase: isYes ? "Past clinic procedures noted. Correct?" : "No past clinic procedures. Correct?",
        displayBadges: [isYes ? "Yes" : "No"],
      };
    }
    case "q14_side_effects_gate": {
      const isYes = value === "true" || value === true;
      return {
        confirmationPhrase: isYes ? "Past treatment side effects noted. Correct?" : "No past side effects. Correct?",
        displayBadges: [isYes ? "Yes" : "No"],
      };
    }
    case "q15_sample_type":
      return {
        confirmationPhrase: `Sample preference: ${value}. Correct?`,
        displayBadges: [String(value)],
      };
    case "q16_consent":
      return {
        confirmationPhrase: "You agree to the clinical genomic analysis. Ready to submit?",
        displayBadges: ["Consent given"],
      };
    default:
      return {
        confirmationPhrase: `I heard: ${String(value)}. Is that right?`,
        displayBadges: [String(value)],
      };
  }
}

// ---------------------------------------------------------
// Main Parse Voice Transcript Entrypoint
// ---------------------------------------------------------
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
      reason: "ambient_fallback",
    };
  }

  // 1. Numerical Questions (Q1 Age)
  if (question.type === "number" || stepId === "q1") {
    const { parsedNumber, error } = extractNumber(cleanTranscript, question.min, question.max);
    if (parsedNumber !== null) {
      const conf = getConfirmationDetails(stepId, parsedNumber);
      return {
        success: true,
        value: parsedNumber,
        rawText: cleanTranscript,
        confidence: 0.95,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return {
      success: false,
      rawText: cleanTranscript,
      reason: error || "ambient_fallback",
    };
  }

  // 2. Biological Sex Gate
  if (stepId === "q_biological_sex") {
    const sex = extractSex(cleanTranscript);
    if (sex) {
      const conf = getConfirmationDetails(stepId, sex);
      return {
        success: true,
        value: sex,
        rawText: cleanTranscript,
        confidence: 0.95,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return {
      success: false,
      rawText: cleanTranscript,
      reason: "ambient_fallback",
    };
  }

  // 3. Duration (Q2)
  if (stepId === "q2") {
    const dur = extractDuration(cleanTranscript);
    if (dur) {
      const conf = getConfirmationDetails(stepId, dur);
      return {
        success: true,
        value: dur,
        rawText: cleanTranscript,
        confidence: 0.92,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return {
      success: false,
      rawText: cleanTranscript,
      reason: "ambient_fallback",
    };
  }

  // 4. Family History (Q3)
  if (stepId === "q3") {
    const fam = extractFamilyHistory(cleanTranscript);
    if (fam.length > 0) {
      const conf = getConfirmationDetails(stepId, fam);
      return {
        success: true,
        value: fam,
        rawText: cleanTranscript,
        confidence: 0.95,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return {
      success: false,
      rawText: cleanTranscript,
      reason: "ambient_fallback",
    };
  }

  // 5. Pattern (Q4)
  if (stepId === "q4") {
    const pat = extractPattern(cleanTranscript);
    if (pat.length > 0) {
      const conf = getConfirmationDetails(stepId, pat);
      return {
        success: true,
        value: pat,
        rawText: cleanTranscript,
        confidence: 0.93,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return {
      success: false,
      rawText: cleanTranscript,
      reason: "ambient_fallback",
    };
  }

  // 6. Diagnosed Conditions (Q5)
  if (stepId === "q5") {
    const cond = extractConditions(cleanTranscript);
    if (cond.length > 0) {
      const conf = getConfirmationDetails(stepId, cond);
      return {
        success: true,
        value: cond,
        rawText: cleanTranscript,
        confidence: 0.93,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return {
      success: false,
      rawText: cleanTranscript,
      reason: "ambient_fallback",
    };
  }

  // 7. Hormonal (Q6/Q7)
  if (stepId === "q6_q7_hormonal") {
    const horm = extractHormonal(cleanTranscript);
    if (horm) {
      const conf = getConfirmationDetails(stepId, horm);
      return {
        success: true,
        value: horm,
        rawText: cleanTranscript,
        confidence: 0.92,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return {
      success: false,
      rawText: cleanTranscript,
      reason: "ambient_fallback",
    };
  }

  // 8. Skin & Body markers (Q8/Q9)
  if (stepId === "q8_q9_skin") {
    const sb = extractSkinBody(cleanTranscript);
    if (sb) {
      const conf = getConfirmationDetails(stepId, sb);
      return {
        success: true,
        value: sb,
        rawText: cleanTranscript,
        confidence: 0.9,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return {
      success: false,
      rawText: cleanTranscript,
      reason: "ambient_fallback",
    };
  }

  // 9. Habits
  if (stepId === "q11_smoking") {
    const smk = extractSmoking(cleanTranscript);
    if (smk) {
      const conf = getConfirmationDetails(stepId, smk);
      return {
        success: true,
        value: smk,
        rawText: cleanTranscript,
        confidence: 0.95,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return { success: false, rawText: cleanTranscript, reason: "ambient_fallback" };
  }

  if (stepId === "q11_alcohol" || stepId === "q11_hard_water" || stepId === "q11_heating_tools" || stepId === "q11_salon_treatments") {
    const yn = extractYesNo(cleanTranscript);
    if (yn !== null) {
      const strVal = yn ? "true" : "false";
      const conf = getConfirmationDetails(stepId, strVal);
      return {
        success: true,
        value: strVal,
        rawText: cleanTranscript,
        confidence: 0.95,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return { success: false, rawText: cleanTranscript, reason: "ambient_fallback" };
  }

  if (stepId === "q11_hair_wash_frequency") {
    const wf = extractWashFreq(cleanTranscript);
    if (wf) {
      const conf = getConfirmationDetails(stepId, wf);
      return {
        success: true,
        value: wf,
        rawText: cleanTranscript,
        confidence: 0.95,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return { success: false, rawText: cleanTranscript, reason: "ambient_fallback" };
  }

  // 10. Triggers in Past 6 Months (Q10)
  if (stepId === "q10_past_6_months") {
    const trigs = extractTriggers(cleanTranscript);
    if (trigs.length > 0) {
      const conf = getConfirmationDetails(stepId, trigs);
      return {
        success: true,
        value: trigs,
        rawText: cleanTranscript,
        confidence: 0.92,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return { success: false, rawText: cleanTranscript, reason: "ambient_fallback" };
  }

  // 11. Products Tried (Q12)
  if (stepId === "q12_products_select") {
    const prods = extractProductsTried(cleanTranscript);
    if (prods.length > 0) {
      const conf = getConfirmationDetails(stepId, prods);
      return {
        success: true,
        value: prods,
        rawText: cleanTranscript,
        confidence: 0.92,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return { success: false, rawText: cleanTranscript, reason: "ambient_fallback" };
  }

  // 12. Procedures Gate (Q13)
  if (stepId === "q13_procedures_gate") {
    const yn = extractYesNo(cleanTranscript);
    if (yn !== null) {
      const strVal = yn ? "true" : "false";
      const conf = getConfirmationDetails(stepId, strVal);
      return {
        success: true,
        value: strVal,
        rawText: cleanTranscript,
        confidence: 0.95,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return { success: false, rawText: cleanTranscript, reason: "ambient_fallback" };
  }

  // 13. Side Effects Gate (Q14)
  if (stepId === "q14_side_effects_gate") {
    const yn = extractYesNo(cleanTranscript);
    if (yn !== null) {
      const strVal = yn ? "true" : "false";
      const conf = getConfirmationDetails(stepId, strVal);
      return {
        success: true,
        value: strVal,
        rawText: cleanTranscript,
        confidence: 0.95,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return { success: false, rawText: cleanTranscript, reason: "ambient_fallback" };
  }

  // 14. Free Text Questions (Q11 salon detail, Q14 side effects describe)
  if (question.type === "text") {
    return {
      success: true,
      value: cleanTranscript,
      rawText: cleanTranscript,
      confidence: 0.9,
      confirmationPhrase: `I heard: "${cleanTranscript}". Looks right?`,
      displayBadges: [cleanTranscript],
    };
  }

  // 15. Sample Type (Q15)
  if (stepId === "q15_sample_type") {
    const st = extractSampleType(cleanTranscript);
    if (st) {
      const conf = getConfirmationDetails(stepId, st);
      return {
        success: true,
        value: st,
        rawText: cleanTranscript,
        confidence: 0.95,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return { success: false, rawText: cleanTranscript, reason: "ambient_fallback" };
  }

  // 16. Consent (Q16)
  if (stepId === "q16_consent") {
    const yn = extractYesNo(cleanTranscript);
    if (yn !== null) {
      const conf = getConfirmationDetails(stepId, yn ? "true" : "false");
      return {
        success: true,
        value: yn ? "true" : "false",
        rawText: cleanTranscript,
        confidence: 0.95,
        confirmationPhrase: conf.confirmationPhrase,
        displayBadges: conf.displayBadges,
      };
    }
    return { success: false, rawText: cleanTranscript, reason: "ambient_fallback" };
  }

  return {
    success: false,
    rawText: cleanTranscript,
    reason: "ambient_fallback",
  };
}
