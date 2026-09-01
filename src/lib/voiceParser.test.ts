import { describe, expect, it } from "bun:test";
import { ALL_QUESTIONS } from "@/data/questions";
import { parseVoiceTranscript } from "./voiceParser";

describe("voiceParser seam", () => {
  const q1 = ALL_QUESTIONS.find((q) => q.id === "q1")!;
  const q11Salon = ALL_QUESTIONS.find((q) => q.id === "q11_salon_detail")!;
  const q14Describe = ALL_QUESTIONS.find((q) => q.id === "q14_side_effects_describe")!;

  describe("Q1 Age (number extraction)", () => {
    it("extracts digits directly from transcript", () => {
      const res = parseVoiceTranscript("q1", q1, "I was around 26 years old when it started");
      expect(res.success).toBe(true);
      expect(res.value).toBe(26);
    });

    it("extracts standalone digit string", () => {
      const res = parseVoiceTranscript("q1", q1, "24");
      expect(res.success).toBe(true);
      expect(res.value).toBe(24);
    });

    it("extracts English number words", () => {
      const res = parseVoiceTranscript("q1", q1, "around twenty eight");
      expect(res.success).toBe(true);
      expect(res.value).toBe(28);

      const res2 = parseVoiceTranscript("q1", q1, "thirty five");
      expect(res2.success).toBe(true);
      expect(res2.value).toBe(35);
    });

    it("extracts common Hindi/Hinglish number words", () => {
      // chhabbis = 26
      const res1 = parseVoiceTranscript("q1", q1, "chhabbis saal");
      expect(res1.success).toBe(true);
      expect(res1.value).toBe(26);

      // pachees = 25
      const res2 = parseVoiceTranscript("q1", q1, "lagbhag pachees");
      expect(res2.success).toBe(true);
      expect(res2.value).toBe(25);

      // tees = 30
      const res3 = parseVoiceTranscript("q1", q1, "tees saal ki umar me");
      expect(res3.success).toBe(true);
      expect(res3.value).toBe(30);

      // chalis = 40
      const res4 = parseVoiceTranscript("q1", q1, "chalis");
      expect(res4.success).toBe(true);
      expect(res4.value).toBe(40);
    });

    it("rejects out-of-bounds numbers (min: 10, max: 99)", () => {
      const resLow = parseVoiceTranscript("q1", q1, "I was 5 years old");
      expect(resLow.success).toBe(false);

      const resHigh = parseVoiceTranscript("q1", q1, "120");
      expect(resHigh.success).toBe(false);
    });

    it("returns false with reason on unparseable speech", () => {
      const res = parseVoiceTranscript("q1", q1, "I don't remember at all");
      expect(res.success).toBe(false);
      expect(res.value).toBeUndefined();
    });
  });

  describe("Q11 Salon Detail (text extraction)", () => {
    it("extracts cleaned descriptive text", () => {
      const res = parseVoiceTranscript(
        "q11_salon_detail",
        q11Salon,
        "  Keratin smoothing treatment done 4 months ago at salon  "
      );
      expect(res.success).toBe(true);
      expect(res.value).toBe("Keratin smoothing treatment done 4 months ago at salon");
    });

    it("fails when transcript is empty or only whitespace", () => {
      const res = parseVoiceTranscript("q11_salon_detail", q11Salon, "   ");
      expect(res.success).toBe(false);
    });
  });

  describe("Q14 Past Side Effects Describe (text extraction)", () => {
    it("extracts cleaned descriptive text", () => {
      const res = parseVoiceTranscript(
        "q14_side_effects_describe",
        q14Describe,
        "Redness, severe itching and scalp flaking with 5% Minoxidil"
      );
      expect(res.success).toBe(true);
      expect(res.value).toBe("Redness, severe itching and scalp flaking with 5% Minoxidil");
    });

    it("fails when transcript is empty", () => {
      const res = parseVoiceTranscript("q14_side_effects_describe", q14Describe, "");
      expect(res.success).toBe(false);
    });
  });
});
