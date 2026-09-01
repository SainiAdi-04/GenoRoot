import { describe, expect, it } from "bun:test";
import {
  getTriageProvider,
  MockTriageProvider,
  SarvamTriageProvider,
  DoctorTriageBriefing,
} from "./triageService";
import { IntakeFormData } from "@/types/schema";

describe("Triage Service Seam", () => {
  describe("Provider Factory", () => {
    it("returns MockTriageProvider when specified", () => {
      const provider = getTriageProvider("mock");
      expect(provider).toBeInstanceOf(MockTriageProvider);
    });

    it("returns SarvamTriageProvider by default", () => {
      const provider = getTriageProvider("sarvam");
      expect(provider).toBeInstanceOf(SarvamTriageProvider);
    });
  });

  describe("MockTriageProvider clinical briefings", () => {
    const mockProvider = new MockTriageProvider();

    it("generates clinical briefing for Rajesh persona (45M, crown thinning, Minoxidil dropout, smoker)", async () => {
      const rajeshData: IntakeFormData = {
        age_hair_loss_began: 45,
        duration: "6-12 months",
        family_history: ["Father had hair loss"],
        pattern: ["Thinning at crown"],
        diagnosed_conditions: ["None"],
        habits: {
          smoking: true,
          smoking_severity: "Moderate 5-10/day",
          alcohol: false,
          hard_water: false,
          hair_wash_frequency: "Daily",
          heating_tools_styling_chemicals: false,
          salon_treatments: false,
        },
        products: [
          {
            name: "Topical Minoxidil",
            used: true,
            duration: "<3mo",
            helped: false,
            side_effects: false,
          },
        ],
      };

      const briefing = await mockProvider.generateTriage(rajeshData);

      expect(briefing.suspected_phenotype).toContain("Androgenetic");
      expect(briefing.red_flags.length).toBeGreaterThanOrEqual(1);
      // Minoxidil dread-shed or early discontinuation alert
      expect(
        briefing.red_flags.some((f) => f.toLowerCase().includes("minoxidil") || f.toLowerCase().includes("shed"))
      ).toBe(true);
      // Talking points exist
      expect(briefing.talking_points.length).toBeGreaterThanOrEqual(2);
      expect(briefing.disclaimer).toContain("not a diagnosis");
    });

    it("generates clinical briefing for Priya persona (27F, dengue shedding, PCOS, hard water)", async () => {
      const priyaData: IntakeFormData = {
        age_hair_loss_began: 27,
        duration: "Less than 6 months",
        pattern: ["Sudden excessive shedding"],
        past_6_months: ["Fever with illness (COVID, Dengue, Typhoid)"],
        diagnosed_conditions: ["PCOS/PCOD"],
        menstrual_cycle: "Irregular",
        habits: {
          smoking: false,
          alcohol: false,
          hard_water: true,
          hair_wash_frequency: "Alternate Days",
          heating_tools_styling_chemicals: false,
          salon_treatments: false,
        },
      };

      const briefing = await mockProvider.generateTriage(priyaData);

      expect(briefing.suspected_phenotype.toLowerCase()).toMatch(/telogen|effluvium|pcos/);
      expect(briefing.red_flags.some((f) => f.toLowerCase().includes("dengue") || f.toLowerCase().includes("shedding"))).toBe(true);
      expect(briefing.talking_points.length).toBeGreaterThanOrEqual(2);
    });

    it("generates clinical briefing for Ananya persona (34F, postpartum, thyroid)", async () => {
      const ananyaData: IntakeFormData = {
        age_hair_loss_began: 34,
        duration: "6-12 months",
        pattern: ["Diffuse thinning"],
        pregnancy_related: "Postpartum <1 year",
        diagnosed_conditions: ["Thyroid disorder"],
      };

      const briefing = await mockProvider.generateTriage(ananyaData);

      expect(briefing.suspected_phenotype.toLowerCase()).toMatch(/postpartum|telogen|thyroid/);
      expect(briefing.contraindications.some((c) => c.toLowerCase().includes("anti-androgen") || c.toLowerCase().includes("contraindicated"))).toBe(true);
    });

    it("handles sparse or empty intake form data safely", async () => {
      const emptyData: IntakeFormData = {};
      const briefing = await mockProvider.generateTriage(emptyData);

      expect(briefing.suspected_phenotype).toBeDefined();
      expect(Array.isArray(briefing.red_flags)).toBe(true);
      expect(Array.isArray(briefing.contraindications)).toBe(true);
      expect(Array.isArray(briefing.talking_points)).toBe(true);
      expect(briefing.disclaimer).toContain("not a diagnosis");
    });
  });
});
