import { describe, expect, it, beforeEach, mock } from "bun:test";
import { TTSService } from "./ttsService";

describe("TTSService with Sarvam Bulbul v3 and WebSpeech Fallback", () => {
  interface MockUtterance {
    text: string;
    voice?: { name: string; lang: string; default: boolean } | null;
    rate?: number;
    pitch?: number;
    volume?: number;
  }

  let tts: TTSService;
  let speakCalls: MockUtterance[] = [];
  let resumeCalls = 0;

  beforeEach(() => {
    speakCalls = [];
    resumeCalls = 0;

    const mockVoices = [
      { name: "Google हिन्दी", lang: "hi-IN", default: false },
      { name: "Google English India", lang: "en-IN", default: false },
      { name: "Google US English", lang: "en-US", default: true },
    ];

    class MockSpeechSynthesisUtterance {
      text: string;
      voice: { name: string; lang: string; default: boolean } | null = null;
      rate: number = 1.0;
      pitch: number = 1.0;
      volume: number = 1.0;
      onstart?: () => void;
      onend?: () => void;
      onerror?: () => void;
      constructor(text: string) {
        this.text = text;
      }
    }

    // Mock window and speechSynthesis
    (globalThis as unknown as { window: unknown }).window = {
      SpeechSynthesisUtterance: MockSpeechSynthesisUtterance,
      speechSynthesis: {
        getVoices: () => mockVoices,
        speak: (utt: MockUtterance) => speakCalls.push(utt),
        cancel: () => {},
        resume: () => {
          resumeCalls++;
        },
        paused: true,
        speaking: false,
      },
    };

    tts = new TTSService();
  });

  it("defaults to Sarvam's flagship Hinglish speaker 'shubh' and allows switching to other Sarvam voices", () => {
    expect(tts.getSpeaker()).toBe("shubh");

    tts.setSpeaker("ishita");
    expect(tts.getSpeaker()).toBe("ishita");

    tts.setSpeaker("priya");
    expect(tts.getSpeaker()).toBe("priya");

    tts.setSpeaker("ratan");
    expect(tts.getSpeaker()).toBe("ratan");
  });

  it("calls /api/tts to generate Sarvam Bulbul v3 audio with chosen speaker", async () => {
    let playedUrl = "";
    class MockAudio {
      src: string;
      paused: boolean = false;
      ended: boolean = false;
      currentTime: number = 0;
      onplay?: () => void;
      onended?: () => void;
      onerror?: () => void;
      constructor(src: string) {
        this.src = src;
        playedUrl = src;
      }
      play() {
        this.onplay?.();
        return Promise.resolve();
      }
      pause() {
        this.paused = true;
      }
    }

    (globalThis as unknown as { Audio: unknown }).Audio = MockAudio;

    const mockFetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      expect(url).toBe("/api/tts");
      expect(body.speaker).toBe("shubh");
      expect(body.text).toBe("Hello, how are you?");

      return new Response(
        JSON.stringify({
          success: true,
          audioBase64: "UklGRgogAgBXQVZF...",
        }),
        { status: 200 }
      );
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    let started = false;
    tts.speak("Hello, how are you?", {
      onStart: () => {
        started = true;
      },
    });

    // Wait for promise resolution
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(playedUrl).toBe("data:audio/wav;base64,UklGRgogAgBXQVZF...");
    expect(started).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    globalThis.fetch = originalFetch;
  });

  it("barge-in stops in-flight audio playback immediately", async () => {
    let paused = false;
    class MockAudio {
      src: string;
      paused: boolean = false;
      ended: boolean = false;
      currentTime: number = 0;
      constructor(src: string) {
        this.src = src;
      }
      play() {
        return Promise.resolve();
      }
      pause() {
        paused = true;
        this.paused = true;
      }
    }

    (globalThis as unknown as { Audio: unknown }).Audio = MockAudio;

    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          audioBase64: "UklGRgogAgBXQVZF...",
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    tts.speak("Testing barge in");
    await new Promise((resolve) => setTimeout(resolve, 20));

    tts.stop();
    expect(paused).toBe(true);
  });

  describe("WebSpeech fallback voice selection", () => {
    it("selects Indian English (en-IN) and NOT Hindi (hi-IN) for English prompts in fallback", () => {
      tts.speakWithWebSpeech("I didn't quite catch that. Could you please tap your answer on the screen instead?");

      expect(speakCalls.length).toBe(1);
      expect(speakCalls[0]?.voice?.lang).toBe("en-IN");
      expect(speakCalls[0]?.voice?.lang).not.toBe("hi-IN");
      expect(speakCalls[0]?.volume).toBe(1.0);
    });

    it("resumes paused speechSynthesis before speaking to prevent silence in Chromium", () => {
      tts.speakWithWebSpeech("Hello world");
      expect(resumeCalls).toBeGreaterThan(0);
    });

    it("selects Hindi voice when prompt contains Devanagari Hindi text", () => {
      tts.speakWithWebSpeech("नमस्ते, कृपया अपनी समस्या बताएं");

      expect(speakCalls.length).toBe(1);
      expect(speakCalls[0]?.voice?.lang).toBe("hi-IN");
    });
  });
});
