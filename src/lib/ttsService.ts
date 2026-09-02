/**
 * Text-to-Speech (TTS) Service for Voice-First Clinical Intake
 * 
 * Powered by Sarvam AI Bulbul v3 for authentic Indian / Hinglish voice synthesis:
 * - Sarvam AI Bulbul v3 with authentic Indian accents (shubh, ishita, priya, ratan)
 * - 0.92x calm, clear clinical pacing tailored for 55-year-old patient accessibility
 * - In-memory audio caching for instant replay on repeat clicks
 * - Blob URL decoding for high performance and zero character-length limits in Chrome
 * - Instant barge-in support: immediately stops playback and aborts in-flight synthesis
 * - No automatic fallback to robotic OS voices (preserves authentic Sarvam voice identity)
 */

import { SARVAM_VOICES, cleanTextForSpeech, detectLanguageForText } from "./sarvamTtsService";

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: unknown) => void;
  rate?: number;
  speaker?: string;
}

export class TTSService {
  private isMuted: boolean = false;
  private currentSpeaker: string = SARVAM_VOICES.default; // Default: 'shubh' (Sarvam's flagship Hinglish voice)
  private currentAudio: HTMLAudioElement | null = null;
  private currentBlobUrl: string | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private abortController: AbortController | null = null;
  private audioCache: Map<string, string> = new Map();

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {};
      }
    }
  }

  public isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      (typeof Audio !== "undefined" || "speechSynthesis" in window)
    );
  }

  public isSpeaking(): boolean {
    const isAudioPlaying = !!(this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended);
    const isSynthSpeaking = typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.speaking;
    return isAudioPlaying || isSynthSpeaking;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getSpeaker(): string {
    return this.currentSpeaker;
  }

  public setSpeaker(speaker: string): void {
    if (speaker && typeof speaker === "string") {
      this.currentSpeaker = speaker.toLowerCase().trim();
    }
  }

  /**
   * Helper to decode Base64 to a streaming Blob URL
   */
  public base64ToBlobUrl(base64: string): string {
    if (typeof window !== "undefined" && typeof window.URL !== "undefined" && typeof atob === "function") {
      try {
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "audio/wav" });
        return URL.createObjectURL(blob);
      } catch {
        // Fallback to data URI if Blob creation fails
      }
    }
    return `data:audio/wav;base64,${base64}`;
  }

  /**
   * Browser SpeechSynthesis fallback voice selection (strictly for manual testing / offline mock)
   */
  public getBestVoiceForText(text: string): SpeechSynthesisVoice | null {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const isHindi = /[\u0900-\u097F]/.test(text);

    if (isHindi) {
      const hiVoice = voices.find(
        (v) => v.lang === "hi-IN" || v.lang.startsWith("hi")
      );
      if (hiVoice) return hiVoice;
    }

    // For English text: strictly pick English voices so Hindi TTS does not produce silence
    const enInVoice = voices.find(
      (v) => v.lang === "en-IN" || (v.name.includes("India") && v.lang.startsWith("en"))
    );
    if (enInVoice) return enInVoice;

    const naturalVoice = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Natural") ||
          v.name.includes("Google") ||
          v.name.includes("Samantha") ||
          v.name.includes("Karen"))
    );
    if (naturalVoice) return naturalVoice;

    const anyEnVoice = voices.find((v) => v.lang.startsWith("en"));
    if (anyEnVoice) return anyEnVoice;

    return voices.find((v) => v.default) || voices[0] || null;
  }

  /**
   * Speak text out loud using Sarvam AI Bulbul v3 with chosen Indian Hinglish speaker.
   */
  public speak(text: string, options?: SpeakOptions): void {
    if (!this.isSupported() || this.isMuted) {
      options?.onEnd?.();
      return;
    }

    // Instant barge-in cancellation: stop existing audio & synthesis
    this.stop();

    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) {
      options?.onEnd?.();
      return;
    }

    const speaker = (options?.speaker || this.currentSpeaker || SARVAM_VOICES.default).toLowerCase();
    const pace = options?.rate ?? 0.95;
    const languageCode = detectLanguageForText(cleanText);
    const cacheKey = `${speaker}_${languageCode}_${pace}_${cleanText}`;

    // 1. Check in-memory audio cache for zero-latency instant replay
    if (this.audioCache.has(cacheKey) && typeof Audio !== "undefined") {
      const cachedBase64 = this.audioCache.get(cacheKey)!;
      this.playBase64Audio(cachedBase64, options);
      return;
    }

    // 2. Synthesize via Next.js /api/tts endpoint (Sarvam Bulbul v3)
    const controller = new AbortController();
    this.abortController = controller;

    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: cleanText,
        speaker,
        pace,
        languageCode,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`TTS HTTP ${res.status}`);
        }
        const data = (await res.json()) as { success: boolean; audioBase64?: string };
        if (!data.success || !data.audioBase64) {
          throw new Error("TTS returned unsuccessful payload");
        }

        // Cache base64 audio
        this.audioCache.set(cacheKey, data.audioBase64);

        if (!controller.signal.aborted) {
          this.playBase64Audio(data.audioBase64, options);
        }
      })
      .catch((err: unknown) => {
        // If aborted by user barge-in, do not trigger error callback
        if (controller.signal.aborted) {
          return;
        }
        // Notify of error; never force the robotic browser voice on the user
        options?.onError?.(err);
      });
  }

  private playBase64Audio(base64: string, options?: SpeakOptions): void {
    if (typeof Audio === "undefined") {
      options?.onError?.(new Error("Audio playback not supported"));
      return;
    }

    try {
      const audioUrl = this.base64ToBlobUrl(base64);
      const isBlob = audioUrl.startsWith("blob:");
      this.currentBlobUrl = isBlob ? audioUrl : null;

      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      const cleanup = () => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        if (isBlob && typeof window !== "undefined" && window.URL) {
          try {
            URL.revokeObjectURL(audioUrl);
          } catch {
            // ignore
          }
        }
        if (this.currentBlobUrl === audioUrl) {
          this.currentBlobUrl = null;
        }
      };

      audio.onplay = () => {
        options?.onStart?.();
      };

      audio.onended = () => {
        cleanup();
        options?.onEnd?.();
      };

      audio.onerror = () => {
        cleanup();
        options?.onError?.();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          cleanup();
          options?.onError?.(err);
        });
      }
    } catch (err: unknown) {
      this.currentAudio = null;
      options?.onError?.(err);
    }
  }

  /**
   * Optional manual Web Speech invocation (for test suite or explicit fallback)
   */
  public speakWithWebSpeech(cleanText: string, options?: SpeakOptions): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      options?.onEnd?.();
      return;
    }

    // Chromium pause bug unpause
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    try {
      const SpeechUtterance =
        window.SpeechSynthesisUtterance ||
        (globalThis as unknown as { SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance })
          .SpeechSynthesisUtterance;
      const utterance = new SpeechUtterance(cleanText);

      utterance.rate = options?.rate ?? 0.92;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voice = this.getBestVoiceForText(cleanText);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        options?.onStart?.();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        options?.onEnd?.();
      };

      utterance.onerror = () => {
        this.currentUtterance = null;
        options?.onError?.();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (err: unknown) {
      options?.onError?.(err);
    }
  }

  /**
   * Barge-in cancellation: stop speech immediately when user interacts or taps mic
   */
  public stop(): void {
    // 1. Abort pending fetch request
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // 2. Pause and release HTML audio
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentAudio = null;
    }

    // 3. Revoke active Blob URL to prevent memory leaks
    if (this.currentBlobUrl && typeof window !== "undefined" && window.URL) {
      try {
        URL.revokeObjectURL(this.currentBlobUrl);
      } catch {
        // ignore
      }
      this.currentBlobUrl = null;
    }

    // 4. Cancel browser speech synthesis if active
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        this.currentUtterance = null;
      } catch {
        // ignore
      }
    }
  }
}

export const tts = new TTSService();
