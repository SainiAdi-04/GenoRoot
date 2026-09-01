import { describe, expect, it } from "bun:test";
import {
  detectGenderCues,
  filterHighConfidenceFields,
  getExtractionProvider,
  MockExtractionProvider,
  SarvamExtractionProvider,
  ExtractedFieldItem,
} from "./extractService";

describe("extractService seam > Gender Cue Detection", () => {
  it("detects female gender from Hindi grammatical markers ('ho gayi thi', 'karti hoon')", () => {
    const result = detectGenderCues(
      "Main bohot pareshan ho gayi thi jab hair fall shuru hua.",
      "I was very troubled when hair fall started."
    );
    expect(result.inferred_gender).toBe("female");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.cues).toContain("ho gayi");
  });

  it("detects female gender from content markers (PCOS, postpartum, pregnancy)", () => {
    const result = detectGenderCues(
      "Mujhe PCOS diagnosed hai aur 6 mahine pehle delivery hui thi.",
      "I have diagnosed PCOS and had delivery 6 months ago."
    );
    expect(result.inferred_gender).toBe("female");
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result.cues?.toLowerCase()).toMatch(/pcos|delivery/);
  });

  it("detects male gender from Hindi grammatical markers ('ka hoon', 'ho gaya tha')", () => {
    const result = detectGenderCues(
      "Main lagbhag 45 saal ka hoon aur crown area me baal kam ho rahe hain.",
      "I am about 45 years old and hair is thinning in crown area."
    );
    expect(result.inferred_gender).toBe("male");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.cues).toContain("ka hoon");
  });

  it("returns unknown when transcript contains no linguistic or content gender cues", () => {
    const result = detectGenderCues(
      "Hair loss started 8 months ago with crown thinning.",
      "Hair loss started 8 months ago with crown thinning."
    );
    expect(result.inferred_gender).toBe("unknown");
    expect(result.confidence).toBeLessThan(0.7);
  });
});

describe("extractService seam > Confidence Filtering", () => {
  it("filters fields with confidence >= 0.7 and excludes fields below threshold", () => {
    const fields: ExtractedFieldItem[] = [
      {
        key: "age_hair_loss_began",
        label: "Age hair loss began",
        value: 28,
        displayValue: "28 years old",
        confidence: 0.95,
        questionId: "q1",
      },
      {
        key: "duration",
        label: "Duration",
        value: "6-12 months",
        displayValue: "6-12 months",
        confidence: 0.85,
        questionId: "q2",
      },
      {
        key: "smoking",
        label: "Smoking",
        value: false,
        displayValue: "No",
        confidence: 0.45, // below 0.7 threshold
        questionId: "q11_smoking",
      },
    ];

    const filtered = filterHighConfidenceFields(fields, 0.7);
    expect(filtered.length).toBe(2);
    expect(filtered.map((f) => f.key)).toEqual(["age_hair_loss_began", "duration"]);
  });
});

describe("extractService seam > Provider Abstraction & Mock Provider", () => {
  it("factory returns MockExtractionProvider when provider is 'mock'", () => {
    const provider = getExtractionProvider("mock");
    expect(provider).toBeInstanceOf(MockExtractionProvider);
  });

  it("factory returns SarvamExtractionProvider by default", () => {
    const provider = getExtractionProvider("sarvam");
    expect(provider).toBeInstanceOf(SarvamExtractionProvider);
  });

  it("mock provider extracts Rajesh persona fields with high confidence", async () => {
    const mockProvider = new MockExtractionProvider();
    const result = await mockProvider.extract(
      "I am about 45 years old. For the past 8 months there has been significant thinning in the crown area. My father had baldness. I smoke 5-6 cigarettes a day and used Tugain.",
      {
        rawCodemix:
          "Main lagbhag 45 saal ka hoon. Pichle 8 mahine se crown area me thinning ho rahi hai. Father ko baldness thi. 5-6 cigarette peeta hoon pehle Tugain lagaya tha.",
      }
    );

    expect(result.gender_inference.inferred_gender).toBe("male");
    expect(result.fields.age_hair_loss_began?.value).toBe(45);
    expect(result.fields.age_hair_loss_began?.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.fields.duration?.value).toBe("6-12 months");
    expect(result.fields.pattern?.value).toContain("Thinning at crown");
    expect(result.fields.family_history?.value).toContain("Father had hair loss");
    expect(result.fields.habits?.smoking?.value).toBe(true);
  });

  it("mock provider extracts Priya persona fields (post-dengue, PCOS, hard water)", async () => {
    const mockProvider = new MockExtractionProvider();
    const result = await mockProvider.extract(
      "My age is 27 years. 4 months ago I had dengue, since then there is heavy shedding while showering. I am also diagnosed with PCOS and my periods remain irregular. We get hard borewell water here.",
      {
        rawCodemix:
          "Meri age 27 saal hai. 4 mahine pehle dengue hua tha tab se heavy shedding ho rahi hai. PCOS diagnosed hai irregular periods rehte hain. Borewell ka hard water aata hai.",
      }
    );

    expect(result.gender_inference.inferred_gender).toBe("female");
    expect(result.fields.age_hair_loss_began?.value).toBe(27);
    expect(result.fields.duration?.value).toBe("Less than 6 months");
    expect(result.fields.pattern?.value).toContain("Sudden excessive shedding");
    expect(result.fields.past_6_months?.value?.[0]).toContain("Severe illness");
    expect(result.fields.diagnosed_conditions?.value).toContain("PCOS/PCOD");
    expect(result.fields.menstrual_cycle?.value).toBe("Irregular");
    expect(result.fields.habits?.hard_water?.value).toBe(true);
  });

  it("handles empty or unparseable transcript gracefully", async () => {
    const mockProvider = new MockExtractionProvider();
    const result = await mockProvider.extract("   ");
    expect(Object.keys(result.fields).length).toBe(0);
    expect(result.gender_inference.inferred_gender).toBe("unknown");
  });

  it("resolves Indian brand names in voice notes (Mintop, Follihair, Scalpe-Pro, Bontress, Finax) to product categories", async () => {
    const mockProvider = new MockExtractionProvider();
    const result = await mockProvider.extract(
      "Doctor recommended Mintop 5% solution and Follihair tablets. I also used Scalpe-Pro shampoo for dandruff.",
      {
        rawCodemix: "Doctor ne Mintop 5% aur Follihair bola tha, aur Scalpe-Pro shampoo bhi use kiya.",
      }
    );

    expect(result.fields.products?.value).toBeDefined();
    const productNames = result.fields.products?.value.map((p) => p.name);
    expect(productNames).toContain("Topical Minoxidil");
    expect(productNames).toContain("Supplements");
    expect(productNames).toContain("OTC/Medicated Shampoos");
  });
});

