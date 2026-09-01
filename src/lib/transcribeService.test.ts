import { describe, expect, it, mock } from "bun:test";
import {
  formatAudioDuration,
  getFallbackForQuestion,
  processAudioTranscription,
} from "./transcribeService";

describe("transcribeService seam", () => {
  const dummyBlob = new Blob(["dummy audio bytes"], { type: "audio/webm" });

  it("handles missing API key by returning fallback simulated transcription", async () => {
    const res = await processAudioTranscription(dummyBlob, {
      apiKey: "",
      questionId: "q1",
    });

    expect(res.success).toBe(true);
    expect(res.isFallback).toBe(true);
    expect(res.codemix).toContain("26 saal");
    expect(res.translate).toContain("26 years old");
  });

  it("provides question-specific fallbacks for Q11 and Q14", () => {
    const q11Fallback = getFallbackForQuestion("q11_salon_detail");
    expect(q11Fallback.codemix).toContain("keratin");

    const q14Fallback = getFallbackForQuestion("q14_side_effects_describe");
    expect(q14Fallback.codemix).toContain("minoxidil");
  });

  it("formats audio duration correctly", () => {
    expect(formatAudioDuration(0)).toBe("0:00");
    expect(formatAudioDuration(5)).toBe("0:05");
    expect(formatAudioDuration(65)).toBe("1:05");
  });

  it("calls Sarvam API with dual modes (codemix and translate) when apiKey is provided", async () => {
    const mockFetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      const formData = init?.body as FormData;
      const mode = formData?.get("mode");
      const model = formData?.get("model");

      expect(model).toBe("saaras:v3");
      expect(init?.headers).toEqual(
        expect.objectContaining({
          "api-subscription-key": "test-sarvam-key",
        })
      );

      if (mode === "codemix") {
        return new Response(
          JSON.stringify({
            request_id: "req-1",
            transcript: "meri age lagbhag 26 saal hai",
            language_code: "hi-IN",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } else if (mode === "translate") {
        return new Response(
          JSON.stringify({
            request_id: "req-2",
            transcript: "my age is approximately 26 years old",
            language_code: "hi-IN",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not found", { status: 404 });
    });

    const res = await processAudioTranscription(dummyBlob, {
      apiKey: "test-sarvam-key",
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(res.success).toBe(true);
    expect(res.codemix).toBe("meri age lagbhag 26 saal hai");
    expect(res.translate).toBe("my age is approximately 26 years old");
    expect(res.languageCode).toBe("hi-IN");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("handles Sarvam API timeout cleanly", async () => {
    const slowFetch = mock(async (_url: string | URL | Request, init?: RequestInit) => {
      return new Promise<Response>((_, reject) => {
        if (init?.signal) {
          init.signal.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        }
      });
    });

    const res = await processAudioTranscription(dummyBlob, {
      apiKey: "test-key",
      fetchFn: slowFetch as unknown as typeof fetch,
      timeoutMs: 10,
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("timed out");
  });

  it("handles Sarvam API failure gracefully", async () => {
    const mockFailFetch = mock(async () => {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    });

    const res = await processAudioTranscription(dummyBlob, {
      apiKey: "invalid-key",
      fetchFn: mockFailFetch as unknown as typeof fetch,
    });

    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("handles empty audio blob", async () => {
    const emptyBlob = new Blob([], { type: "audio/webm" });
    const res = await processAudioTranscription(emptyBlob, {
      apiKey: "test-key",
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("empty");
  });
});
