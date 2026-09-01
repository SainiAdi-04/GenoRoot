import { describe, expect, it } from "bun:test";
import { POST } from "./route";

describe("API Route /api/triage seam", () => {
  it("returns 400 if request body has no formData", async () => {
    const req = new Request("http://localhost:3000/api/triage", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("formData");
  });

  it("generates clinical briefing and returns 200 with triage structure", async () => {
    const req = new Request("http://localhost:3000/api/triage", {
      method: "POST",
      body: JSON.stringify({
        formData: {
          age_hair_loss_began: 45,
          duration: "6-12 months",
          family_history: ["Father had hair loss"],
          pattern: ["Thinning at crown"],
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
            },
          ],
        },
        provider: "mock",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.triage).toBeDefined();
    expect(data.triage.suspected_phenotype).toContain("Androgenetic");
    expect(Array.isArray(data.triage.red_flags)).toBe(true);
    expect(Array.isArray(data.triage.contraindications)).toBe(true);
    expect(Array.isArray(data.triage.talking_points)).toBe(true);
    expect(data.triage.disclaimer).toContain("not a diagnosis");
  });

  it("accepts direct completed form JSON without wrapper envelope", async () => {
    const directFormJSON = {
      age_hair_loss_began: 27,
      duration: "Less than 6 months",
      pattern: ["Sudden excessive shedding"],
      past_6_months: ["Fever with illness (COVID, Dengue, Typhoid)"],
      diagnosed_conditions: ["PCOS/PCOD"],
      provider: "mock",
    };

    const req = new Request("http://localhost:3000/api/triage", {
      method: "POST",
      body: JSON.stringify(directFormJSON),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.triage.suspected_phenotype.toLowerCase()).toMatch(/telogen|dengue|pcos/);
  });
});

