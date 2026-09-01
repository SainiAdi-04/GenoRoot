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

async function callSarvamSTTMode(
  audioBlobOrFile: Blob | File,
  mode: "codemix" | "translate",
  apiKey: string,
  fetchFn: typeof fetch,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<{ transcript: string; languageCode?: string }> {
  const formData = new FormData();
  formData.append("file", audioBlobOrFile, "audio.webm");
  formData.append("model", "saaras:v3");
  formData.append("mode", mode);

  // Cross-runtime timeout signal
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchFn(SARVAM_STT_ENDPOINT, {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
      },
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Sarvam STT (${mode}) error ${res.status}: ${errorText || res.statusText}`);
    }

    const data = (await res.json()) as { transcript?: string; language_code?: string };
    return {
      transcript: (data.transcript || "").trim(),
      languageCode: data.language_code,
    };
  } finally {
    clearTimeout(timeoutId);
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
    // Call both codemix and translate modes in parallel
    const [codemixRes, translateRes] = await Promise.all([
      callSarvamSTTMode(audioBlobOrFile, "codemix", apiKey, fetchFn, timeoutMs),
      callSarvamSTTMode(audioBlobOrFile, "translate", apiKey, fetchFn, timeoutMs),
    ]);

    return {
      success: true,
      codemix: codemixRes.transcript,
      translate: translateRes.transcript,
      languageCode: translateRes.languageCode || codemixRes.languageCode,
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
