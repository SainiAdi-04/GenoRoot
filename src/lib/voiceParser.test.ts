import { describe, expect, it } from "bun:test";
import { ALL_QUESTIONS } from "@/data/questions";
import { parseVoiceTranscript, extractFamilyHistory } from "./voiceParser";

describe("voiceParser seam", () => {
  const q1 = ALL_QUESTIONS.find((q) => q.id === "q1")!;
  const qSex = ALL_QUESTIONS.find((q) => q.id === "q_biological_sex")!;
  const q2 = ALL_QUESTIONS.find((q) => q.id === "q2")!;
  const q3 = ALL_QUESTIONS.find((q) => q.id === "q3")!;
  const q4 = ALL_QUESTIONS.find((q) => q.id === "q4")!;
  const q5 = ALL_QUESTIONS.find((q) => q.id === "q5")!;
  const q11Smoking = ALL_QUESTIONS.find((q) => q.id === "q11_smoking")!;
  const q11Water = ALL_QUESTIONS.find((q) => q.id === "q11_hard_water")!;
  const q11Salon = ALL_QUESTIONS.find((q) => q.id === "q11_salon_detail")!;
  const q14Describe = ALL_QUESTIONS.find((q) => q.id === "q14_side_effects_describe")!;

  describe("Q1 Age (number extraction)", () => {
    it("extracts digits directly from transcript", () => {
      const res = parseVoiceTranscript("q1", q1, "I was around 26 years old when it started");
      expect(res.success).toBe(true);
      expect(res.value).toBe(26);
      expect(res.confirmationPhrase).toBe("You said 26 years old. Correct?");
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

      const res2 = parseVoiceTranscript("q1", q1, "fifty five");
      expect(res2.success).toBe(true);
      expect(res2.value).toBe(55);
      expect(res2.confirmationPhrase).toBe("You said 55 years old. Correct?");
    });

    it("extracts common Hindi/Hinglish number words", () => {
      const res1 = parseVoiceTranscript("q1", q1, "chhabbis saal");
      expect(res1.success).toBe(true);
      expect(res1.value).toBe(26);

      const res2 = parseVoiceTranscript("q1", q1, "lagbhag pachees");
      expect(res2.success).toBe(true);
      expect(res2.value).toBe(25);

      const res3 = parseVoiceTranscript("q1", q1, "tees saal ki umar me");
      expect(res3.success).toBe(true);
      expect(res3.value).toBe(30);

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

  describe("Screen 3: Biological Sex (Simple Keyword)", () => {
    it("extracts male keyword and builds confirmation phrase", () => {
      const res = parseVoiceTranscript("q_biological_sex", qSex, "I am male");
      expect(res.success).toBe(true);
      expect(res.value).toBe("male");
      expect(res.confirmationPhrase).toBe("Got it, Male. Is that right?");
    });

    it("extracts female keyword and builds confirmation phrase", () => {
      const res = parseVoiceTranscript("q_biological_sex", qSex, "Female");
      expect(res.success).toBe(true);
      expect(res.value).toBe("female");
      expect(res.confirmationPhrase).toBe("Got it, Female. Is that right?");
    });

    it("extracts prefer not to say", () => {
      const res = parseVoiceTranscript("q_biological_sex", qSex, "I prefer not to say");
      expect(res.success).toBe(true);
      expect(res.value).toBe("prefer_not_to_say");
    });
  });

  describe("Screen 5: Duration (Single-choice)", () => {
    it("matches under six months", () => {
      const res = parseVoiceTranscript("q2", q2, "under six months");
      expect(res.success).toBe(true);
      expect(res.value).toBe("Less than 6 months");
      expect(res.confirmationPhrase).toContain("Less than 6 months, noted.");
    });

    it("matches six to twelve months", () => {
      const res = parseVoiceTranscript("q2", q2, "around 6 to 12 months");
      expect(res.success).toBe(true);
      expect(res.value).toBe("6-12 months");
    });

    it("matches Hindi Devanagari 6 months ('लगभग 6 महीनों से जो समस्या हो रही है')", () => {
      const res = parseVoiceTranscript("q2", q2, "लगभग 6 महीनों से जो समस्या हो रही है");
      expect(res.success).toBe(true);
      expect(res.value).toBe("6-12 months");
      expect(res.confirmationPhrase).toContain("6-12 months, noted.");
    });

    it("matches Hinglish 'pichle 8 mahine se'", () => {
      const res = parseVoiceTranscript("q2", q2, "pichle 8 mahine se problem hai");
      expect(res.success).toBe(true);
      expect(res.value).toBe("6-12 months");
    });

    it("matches Hindi Devanagari less than 6 ('3 महीने से')", () => {
      const res = parseVoiceTranscript("q2", q2, "3 महीने से समस्या है");
      expect(res.success).toBe(true);
      expect(res.value).toBe("Less than 6 months");
    });

    it("matches over a year", () => {
      const res = parseVoiceTranscript("q2", q2, "over a year now");
      expect(res.success).toBe(true);
      expect(res.value).toBe("Over a year");
    });

    it("matches Hindi Devanagari over a year ('लगभग 2 साल से')", () => {
      const res = parseVoiceTranscript("q2", q2, "लगभग 2 साल से");
      expect(res.success).toBe(true);
      expect(res.value).toBe("Over a year");
    });
  });

  describe("Screen 6: Family History (Multi-select Keyword Bag)", () => {
    it("matches father and mother from mock ASR transcript", () => {
      const transcript = "My dad and my mom have it";
      const res = parseVoiceTranscript("q3", q3, transcript);
      expect(res.success).toBe(true);
      const val = res.value as string[];
      expect(val).toContain("Father had hair loss");
      expect(val).toContain("Mother had hair loss");
      expect(res.confirmationPhrase).toBe("I heard Father and Mother. Is that correct?");
      expect(res.displayBadges).toEqual(["Father", "Mother"]);
    });

    it("matches siblings from 'Just my brother'", () => {
      const transcript = "Just my brother";
      const res = parseVoiceTranscript("q3", q3, transcript);
      expect(res.success).toBe(true);
      const val = res.value as string[];
      expect(val).toContain("Siblings with thinning or baldness");
      expect(res.confirmationPhrase).toBe("I heard Siblings. Is that correct?");
    });

    it("clears all other selections when 'no one' or 'none' is mentioned", () => {
      const transcript = "No one in my family has hair loss";
      const res = parseVoiceTranscript("q3", q3, transcript);
      expect(res.success).toBe(true);
      expect(res.value).toEqual(["No known family history"]);
      expect(res.confirmationPhrase).toBe("I heard no family history. Is that correct?");
    });

    it("pure extractFamily helper function behaves deterministically", () => {
      const out1 = extractFamilyHistory("my father and sister");
      expect(out1).toContain("Father had hair loss");
      expect(out1).toContain("Siblings with thinning or baldness");

      const outNone = extractFamilyHistory("koi nahi, none of them");
      expect(outNone).toEqual(["No known family history"]);
    });
  });

  describe("Screen 7: Pattern (Multi-select Keyword Matcher)", () => {
    it("matches receding hairline and crown thinning", () => {
      const res = parseVoiceTranscript("q4", q4, "receding hairline and thinning at the crown");
      expect(res.success).toBe(true);
      const val = res.value as string[];
      expect(val).toContain("Receding hairline");
      expect(val).toContain("Thinning at crown");
      expect(res.confirmationPhrase).toContain("receding hairline and thinning at crown. Right?");
    });
  });

  describe("Screen 8: Diagnosed Conditions", () => {
    it("matches PCOS and thyroid", () => {
      const res = parseVoiceTranscript("q5", q5, "I have been diagnosed with PCOS and thyroid");
      expect(res.success).toBe(true);
      const val = res.value as string[];
      expect(val).toContain("PCOS/PCOD");
      expect(val).toContain("Thyroid disorder");
    });
  });

  describe("Screen 10: Habits", () => {
    it("matches non-smoker", () => {
      const res = parseVoiceTranscript("q11_smoking", q11Smoking, "No I don't smoke");
      expect(res.success).toBe(true);
      expect(res.value).toBe("No");
      expect(res.confirmationPhrase).toBe("Recorded Non-smoker. Is that right?");
    });

    it("matches moderate smoking severity", () => {
      const res = parseVoiceTranscript("q11_smoking", q11Smoking, "yes about 5 to 10 cigarettes a day");
      expect(res.success).toBe(true);
      expect(res.value).toBe("Moderate 5-10/day");
    });

    it("matches hard water use", () => {
      const res = parseVoiceTranscript("q11_hard_water", q11Water, "yes we have hard borewell water");
      expect(res.success).toBe(true);
      expect(res.value).toBe("true");
    });
  });

  describe("Ambient Noise Fallback", () => {
    it("returns ambient_fallback when no keywords are recognized", () => {
      const res = parseVoiceTranscript("q3", q3, "lalala background cafeteria noise");
      expect(res.success).toBe(false);
      expect(res.reason).toBe("ambient_fallback");
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
