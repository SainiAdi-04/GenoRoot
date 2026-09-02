/**
 * Sarvam AI Text-to-Speech (TTS) Service using Bulbul v3
 * Official docs: https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/how-to/change-the-speaker-voice
 * 
 * Recommended Voices per Sarvam Docs:
 * - shubh: Sarvam default, flagship natural Indian / Hinglish male voice
 * - ishita: Tier 1 (0.13% CER) - Top recommended female voice for en-IN & bilingual
 * - priya: Tier 1 (0.13% CER) - Top recommended female voice for hi-IN / Hinglish
 * - ratan: Tier 2 (0.33% CER) - Top recommended male voice for en-IN
 */

export const SARVAM_VOICES = {
  default: "shubh",
  male_hinglish: "shubh",
  female_indian_english: "ishita",
  female_hinglish: "priya",
  male_indian_english: "ratan",
} as const;

export type SarvamVoiceKey = keyof typeof SARVAM_VOICES;

export interface SynthesizeOptions {
  text: string;
  speaker?: string;
  languageCode?: "hi-IN" | "en-IN";
  pace?: number;
  apiKey?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export interface SynthesizeResult {
  success: boolean;
  audioBase64?: string;
  format?: "wav";
  speaker?: string;
  languageCode?: string;
  error?: string;
  isFallback?: boolean;
}

const SARVAM_TTS_ENDPOINT = "https://api.sarvam.ai/text-to-speech";
const DEFAULT_TIMEOUT_MS = 12000;

// Common Hinglish / Hindi vocabulary markers to automatically select hi-IN
const HINGLISH_PATTERN = /[\u0900-\u097F]|(\b(aap|aapko|mera|meri|mere|hai|hain|tha|thi|the|kya|kyun|kaise|nahi|pehle|baad|mahine|saal|khujli|baal|dengue|pareshan|bataiye|samajh|namaste)\b)/i;

export function detectLanguageForText(text: string): "hi-IN" | "en-IN" {
  if (HINGLISH_PATTERN.test(text)) {
    return "hi-IN";
  }
  return "en-IN";
}

export function cleanTextForSpeech(text: string): string {
  return text
    // Strip all Unicode emojis, pictographs, and variation selectors
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "")
    // Strip special checkmarks, symbols, and bullets
    .replace(/[✓✗•–—]/g, " ")
    // Strip "Why we ask:" clinical rationale micro-copy
    .replace(/Why we ask:[\s\S]*$/i, "")
    // Strip markdown formatting symbols
    .replace(/[*_#`~]/g, "")
    // Replace trailing colons with period for natural sentence pause in TTS
    .replace(/:\s*$/, ".")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

export async function synthesizeSpeech(
  options: SynthesizeOptions
): Promise<SynthesizeResult> {
  const cleanText = cleanTextForSpeech(options.text);
  if (!cleanText) {
    return {
      success: false,
      error: "Text payload is empty",
    };
  }

  const apiKey = options.apiKey !== undefined ? options.apiKey : (process.env.SARVAM_API_KEY || "");
  const fetchFn = options.fetchFn || fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // If no API key is provided, return fallback indicator
  if (!apiKey.trim()) {
    return {
      success: false,
      isFallback: true,
      error: "No Sarvam API key configured",
    };
  }

  const languageCode = options.languageCode || detectLanguageForText(cleanText);
  // Default to Sarvam's flagship natural Hinglish voice 'shubh'
  const speaker = (options.speaker || SARVAM_VOICES.default).toLowerCase();
  const pace = options.pace ?? 0.95;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchFn(SARVAM_TTS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text: cleanText,
        language_code: languageCode,
        model: "bulbul:v3",
        speaker,
        pace,
        speech_sample_rate: 24000,
        output_audio_codec: "wav",
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      let parsedError = errorText;
      try {
        const json = JSON.parse(errorText);
        parsedError = json?.error?.message || json?.message || errorText;
      } catch {
        // raw
      }
      throw new Error(`Sarvam TTS error ${res.status}: ${parsedError || res.statusText}`);
    }

    const data = (await res.json()) as { audios?: string[]; request_id?: string };
    const audioBase64 = data.audios && data.audios[0];

    if (!audioBase64) {
      throw new Error("Sarvam TTS returned empty audio payload");
    }

    return {
      success: true,
      audioBase64,
      format: "wav",
      speaker,
      languageCode,
    };
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"))) {
      return {
        success: false,
        error: "Sarvam TTS request timed out",
        isFallback: true,
      };
    }
    const message = err instanceof Error ? err.message : "Failed to synthesize speech";
    return {
      success: false,
      error: message,
      isFallback: true,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
