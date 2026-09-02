import { describe, expect, it } from "bun:test";
import { POST } from "./route";

describe("API Route /api/tts seam", () => {
  it("returns 400 when request body is missing text", async () => {
    const req = new Request("http://localhost/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it("handles valid text payload", async () => {
    const req = new Request("http://localhost/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Namaste, aapka swagat hai.",
        speaker: "shubh",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("success");
  });
});
