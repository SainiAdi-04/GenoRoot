import { describe, expect, it } from "bun:test";
import { POST } from "./route";

describe("API Route /api/extract seam", () => {
  it("returns 400 if body is empty or translate transcript is missing", async () => {
    const req = new Request("http://localhost:3000/api/extract", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("transcript");
  });

  it("extracts fields and returns 200 with structured fields and gender inference", async () => {
    const req = new Request("http://localhost:3000/api/extract", {
      method: "POST",
      body: JSON.stringify({
        translate: "I am 45 years old with crown thinning for 8 months. Father had hair loss.",
        codemix: "Main 45 saal ka hoon crown thinning hai.",
        provider: "mock",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.fields).toBeDefined();
    expect(Array.isArray(data.fields)).toBe(true);
    expect(data.fields.length).toBeGreaterThanOrEqual(3);
    expect(data.genderInference.inferred_gender).toBe("male");
  });

  it("handles unextractable speech gracefully with 0 fields and 200 OK", async () => {
    const req = new Request("http://localhost:3000/api/extract", {
      method: "POST",
      body: JSON.stringify({
        translate: "Hello good morning how are you.",
        codemix: "Namaste kaise hain aap.",
        provider: "mock",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.fields.length).toBe(0);
  });
});
