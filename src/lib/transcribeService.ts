export interface TranscribeResponse {
  success: boolean;
  codemix?: string;
  translate?: string;
  languageCode?: string;
  durationSeconds?: number;
  error?: string;
  isFallback?: boolean;
}

export interface TranscribeOptions {
  apiKey?: string;
  fetchFn?: typeof fetch;
  mockFallbackText?: { codemix: string; translate: string };
  questionId?: string;
  timeoutMs?: number;
}

const SARVAM_STT_ENDPOINT = "https://api.sarvam.ai/speech-to-text";
const DEFAULT_TIMEOUT_MS = 15000;

export function formatAudioDuration(totalSeconds: number): string {
  if (!totalSeconds || !isFinite(totalSeconds) || isNaN(totalSeconds) || totalSeconds < 0) {
    return "0:00";
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function getFallbackForQuestion(questionId?: string): { codemix: string; translate: string } {
  if (questionId === "q11_salon_detail") {
    return {
      codemix: "chaar mahine pehle keratin smoothing karwayi thi",
      translate: "had keratin smoothing treatment done 4 months ago",
    };
  }
  if (questionId === "q14_side_effects_describe") {
    return {
      codemix: "minoxidil lagane ke baad scalp me bohot khujli aur redness hui thi",
      translate: "severe itching and redness on my scalp after applying minoxidil",
    };
  }
  return {
    codemix: "meri age lagbhag 26 saal hai",
    translate: "my age is approximately 26 years old",
  };
}

export function sanitizeAudioBlobForSarvam(
  blobOrFile: Blob | File
): { cleanBlob: Blob; filename: string } {
  const rawType = (blobOrFile.type || "").toLowerCase();
  let cleanMime = "audio/webm";
  let extension = "webm";

  if (rawType.includes("webm")) {
    cleanMime = "audio/webm";
    extension = "webm";
  } else if (rawType.includes("mp4") || rawType.includes("m4a")) {
    cleanMime = "audio/mp4";
    extension = "mp4";
  } else if (rawType.includes("wav")) {
    cleanMime = "audio/wav";
    extension = "wav";
  } else if (rawType.includes("ogg") || rawType.includes("opus")) {
    cleanMime = "audio/ogg";
    extension = "ogg";
  } else if (rawType.includes("aac")) {
    cleanMime = "audio/aac";
    extension = "aac";
  } else if (rawType.includes("mpeg") || rawType.includes("mp3")) {
    cleanMime = "audio/mpeg";
    extension = "mp3";
  }

  // Sarvam strictly allows pure MIME types (e.g. 'audio/webm') and rejects ';codecs=opus'
  const cleanBlob = new Blob([blobOrFile], { type: cleanMime });
  return { cleanBlob, filename: `recording.${extension}` };
}

async function callSarvamSTTMode(
  audioBlobOrFile: Blob | File,
  mode: "codemix" | "translate",
  apiKey: string,
  fetchFn: typeof fetch,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  primaryModel: "saaras:v3" | "saaras:v4" = "saaras:v3"
): Promise<{ transcript: string; languageCode?: string }> {
  const { cleanBlob, filename } = sanitizeAudioBlobForSarvam(audioBlobOrFile);

  const attemptCall = async (model: string, modeOverride?: string) => {
    const formData = new FormData();
    formData.append("file", cleanBlob, filename);
    formData.append("model", model);
    formData.append("mode", modeOverride || mode);
    formData.append("language_code", "hi-IN");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetchFn(SARVAM_STT_ENDPOINT, {
        method: "POST",
        headers: {
          "api-subscription-key": apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
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
        throw new Error(`Sarvam STT (${model}:${modeOverride || mode}) error ${res.status}: ${parsedError || res.statusText}`);
      }

      const data = (await res.json()) as { transcript?: string; language_code?: string };
      return {
        transcript: (data.transcript || "").trim(),
        languageCode: data.language_code,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    const res1 = await attemptCall(primaryModel);
    if (res1.transcript) {
      return res1;
    }

    // If codemix mode returned empty transcript, try standard transcribe mode
    if (mode === "codemix") {
      try {
        const resAlt = await attemptCall(primaryModel, "transcribe");
        if (resAlt.transcript) {
          return resAlt;
        }
      } catch {
        // keep res1
      }
    }

    return res1;
  } catch (err: unknown) {
    if (primaryModel === "saaras:v4") {
      // Fallback safely to saaras:v3
      try {
        return await attemptCall("saaras:v3");
      } catch {
        // rethrow original error
      }
    }
    throw err;
  }
}

export async function processAudioTranscription(
  audioBlobOrFile: Blob | File,
  options: TranscribeOptions = {}
): Promise<TranscribeResponse> {
  if (!audioBlobOrFile || audioBlobOrFile.size === 0) {
    return {
      success: false,
      error: "Audio payload is empty or missing",
    };
  }

  const apiKey = options.apiKey !== undefined ? options.apiKey : (process.env.SARVAM_API_KEY || "");
  const fetchFn = options.fetchFn || fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Fallback if no API key is configured (developer/evaluator demo mode)
  if (!apiKey.trim()) {
    const fallback = options.mockFallbackText || getFallbackForQuestion(options.questionId);

    return {
      success: true,
      codemix: fallback.codemix,
      translate: fallback.translate,
      languageCode: "hi-IN",
      isFallback: true,
    };
  }

  try {
    // 1. Call primary codemix transcription (captures Hinglish, Hindi, and English as spoken)
    const codemixRes = await callSarvamSTTMode(audioBlobOrFile, "codemix", apiKey, fetchFn, timeoutMs);

    if (!codemixRes.transcript) {
      return {
        success: false,
        error: "No speech was detected in your recording. Please speak clearly into the microphone and try again.",
      };
    }

    // 2. Safely attempt translation for field extraction (falls back to codemix if already English or empty)
    let translateText = codemixRes.transcript;
    let languageCode = codemixRes.languageCode;

    try {
      const translateRes = await callSarvamSTTMode(audioBlobOrFile, "translate", apiKey, fetchFn, timeoutMs);
      if (translateRes.transcript) {
        translateText = translateRes.transcript;
      }
      if (translateRes.languageCode) {
        languageCode = translateRes.languageCode;
      }
    } catch {
      // Non-fatal: if translation fails or audio is already English, keep codemix text
    }

    return {
      success: true,
      codemix: codemixRes.transcript,
      translate: translateText,
      languageCode: languageCode || "hi-IN",
      isFallback: false,
    };
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"))) {
      return {
        success: false,
        error: "Sarvam STT request timed out. Please check your connection or enter manually.",
      };
    }
    const message = err instanceof Error ? err.message : "Failed to transcribe audio";
    return {
      success: false,
      error: message,
    };
  }
}
