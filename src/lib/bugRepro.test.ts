import { describe, expect, it } from "bun:test";
import { formatAudioDuration } from "./transcribeService";
import { parseVoiceTranscript } from "./voiceParser";
import { ALL_QUESTIONS } from "../data/questions";

describe("Diagnosing Bug Feedback Loop (Phase 1)", () => {
  const q3 = ALL_QUESTIONS.find((q) => q.id === "q3")!;

  describe("Symptom 1: Audio player displays Infinity:NaN and breaks playback state", () => {
    it("formatAudioDuration must NOT return 'Infinity:NaN' when duration is Infinity or NaN", () => {
      // Current implementation returns 'Infinity:NaN' because of Math.floor(Infinity % 60)
      const formattedInfinity = formatAudioDuration(Infinity);
      expect(formattedInfinity).not.toContain("Infinity");
      expect(formattedInfinity).not.toContain("NaN");

      const formattedNaN = formatAudioDuration(NaN);
      expect(formattedNaN).not.toContain("NaN");
    });
  });

  describe("Symptom 2: Family history voice transcript is not caught properly", () => {
    it("catches 'डैड' and 'फादर' in Hindi Devanagari for Q3 Family History", () => {
      const transcript = "मेरे डैड को हेयर फॉल की प्रॉब्लम थी";
      const res = parseVoiceTranscript("q3", q3, transcript);
      expect(res.success).toBe(true);
      expect(res.value as string[]).toContain("Father had hair loss");
    });

    it("catches 'दादाजी' and 'नानाजी' (paternal/maternal grandfather) in Hindi for Q3", () => {
      const transcript = "मेरे दादाजी को बाल झड़ने की समस्या थी";
      const res = parseVoiceTranscript("q3", q3, transcript);
      expect(res.success).toBe(true);
      expect(res.value as string[]).toContain("Father had hair loss");
    });

    it("catches 'भैया' and 'दीदी' in Hindi for Q3 Siblings", () => {
      const transcript = "मेरे भैया के बाल झड़ रहे हैं";
      const res = parseVoiceTranscript("q3", q3, transcript);
      expect(res.success).toBe(true);
      expect(res.value as string[]).toContain("Siblings with thinning or baldness");
    });

    it("catches the exact spoken transcript from the user's screenshot where 'dad' was transcribed as 'दर्द'", () => {
      const transcript = "मुझे लगता है कि मुझे दर्द की समस्या है चोरी के कारण कुछ हो चुकी है मुझे ऐसा लगता है";
      const res = parseVoiceTranscript("q3", q3, transcript);
      expect(res.success).toBe(true);
      expect(res.value as string[]).toContain("Father had hair loss");
    });
  });
});
