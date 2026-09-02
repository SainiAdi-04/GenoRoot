import { describe, expect, it, mock } from "bun:test";
import { synthesizeSpeech, SARVAM_VOICES, cleanTextForSpeech } from "./sarvamTtsService";

describe("Sarvam TTS Service seam", () => {
  it("defines Sarvam recommended Indian / Hinglish speakers from official docs", () => {
    // Official Sarvam docs: shubh is default Hinglish, ishita & priya are Tier 1 (0.13% CER), ratan is en-IN recommended
    expect(SARVAM_VOICES).toBeDefined();
    expect(SARVAM_VOICES.default).toBe("shubh");
    expect(SARVAM_VOICES.male_hinglish).toBe("shubh");
    expect(SARVAM_VOICES.female_indian_english).toBe("ishita");
    expect(SARVAM_VOICES.female_hinglish).toBe("priya");
    expect(SARVAM_VOICES.male_indian_english).toBe("ratan");
  });

  it("calls Sarvam API endpoint with bulbul:v3 and chosen speaker", async () => {
    const mockFetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      expect(url).toBe("https://api.sarvam.ai/text-to-speech");
      expect(body.model).toBe("bulbul:v3");
      expect(body.speaker).toBe("shubh");
      expect(body.language_code).toBe("hi-IN");
      expect(body.text).toBe("Namaste");

      return new Response(
        JSON.stringify({
          request_id: "test-123",
          audios: ["UklGRgogAgBXQVZFZm10IBAAAAABAAEA..."],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const result = await synthesizeSpeech({
      text: "Namaste",
      speaker: "shubh",
      languageCode: "hi-IN",
      apiKey: "test-key",
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(result.success).toBe(true);
    expect(result.audioBase64).toBe("UklGRgogAgBXQVZFZm10IBAAAAABAAEA...");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("chooses language code hi-IN for Hinglish / Devanagari text, en-IN for English text", async () => {
    const calls: any[] = [];
    const mockFetch = mock(async (_url: any, init?: RequestInit) => {
      calls.push(JSON.parse(init?.body as string));
      return new Response(JSON.stringify({ audios: ["mockAudio"] }), { status: 200 });
    });

    // Hinglish with Hindi phrase
    await synthesizeSpeech({
      text: "Aapko scalp me khujli ya redness hoti hai?",
      apiKey: "test-key",
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    // English clinical prompt
    await synthesizeSpeech({
      text: "Roughly how old were you when you first noticed changes in your hair density?",
      apiKey: "test-key",
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(calls[0].language_code).toBe("hi-IN");
    expect(calls[1].language_code).toBe("en-IN");
  });

  it("cleanTextForSpeech strips all emojis including 🎉 and trailing colons from message bubbles", () => {
    const raw = "🎉 6 questions auto-filled from your voice note! Confirm all in one tap or tap any item to edit:";
    const cleaned = cleanTextForSpeech(raw);
    expect(cleaned).not.toContain("🎉");
    expect(cleaned).toBe("6 questions auto-filled from your voice note! Confirm all in one tap or tap any item to edit.");
  });
});
