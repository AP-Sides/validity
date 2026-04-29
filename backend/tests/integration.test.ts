import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus, connectWebSocket, connectAuthenticatedWebSocket, waitForMessage } from "./helpers";

describe("API Integration Tests", () => {
  test("POST /api/validate-claim - successful validation", async () => {
    const res = await api("/api/validate-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: "The Earth is round" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.verdict).toBeDefined();
    expect(["VALID", "INVALID", "INCONCLUSIVE"]).toContain(data.verdict);
  });

  test("POST /api/validate-claim - missing required field", async () => {
    const res = await api("/api/validate-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/validate-claim - empty claim string", async () => {
    const res = await api("/api/validate-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: "" }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/validate-claim - response includes statistics", async () => {
    const res = await api("/api/validate-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: "Water boils at 100 degrees Celsius at sea level" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.supporting_count).toBeDefined();
    expect(data.refuting_count).toBeDefined();
    expect(data.neutral_count).toBeDefined();
    expect(data.total_count).toBeDefined();
    expect(data.supporting_pct).toBeDefined();
    expect(data.refuting_pct).toBeDefined();
    expect(data.neutral_pct).toBeDefined();
  });

  test("POST /api/validate-claim - response includes summary, confidence, and studies", async () => {
    const res = await api("/api/validate-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: "The sun is a star" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.summary).toBeDefined();
    expect(typeof data.summary).toBe("string");
    expect(data.confidence).toBeDefined();
    expect(typeof data.confidence).toBe("number");
    expect(Array.isArray(data.studies)).toBe(true);
  });

  test("POST /api/validate-claim - response includes weighted scores", async () => {
    const res = await api("/api/validate-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: "Climate change is caused by human activities" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.weighted_supporting).toBeDefined();
    expect(data.weighted_refuting).toBeDefined();
    expect(data.weighted_neutral).toBeDefined();
    expect(data.total_weight).toBeDefined();
  });

  test("POST /api/validate-claim/deeper - successful validation", async () => {
    const res = await api("/api/validate-claim/deeper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: "The Earth is round" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.studies)).toBe(true);
    expect(data.new_count).toBeDefined();
    expect(typeof data.new_count).toBe("number");
  });

  test("POST /api/validate-claim/deeper - missing required field", async () => {
    const res = await api("/api/validate-claim/deeper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/validate-claim/deeper - empty claim string", async () => {
    const res = await api("/api/validate-claim/deeper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: "" }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/validate-claim/deeper - with exclude_titles parameter", async () => {
    const res = await api("/api/validate-claim/deeper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim: "Water boils at 100 degrees Celsius",
        exclude_titles: ["Study A", "Study B"],
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.studies)).toBe(true);
    expect(data.new_count).toBeDefined();
  });

  test("POST /api/validate-claim/deeper - response includes study details", async () => {
    const res = await api("/api/validate-claim/deeper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: "Vitamin C prevents colds" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    if (data.studies && data.studies.length > 0) {
      const study = data.studies[0];
      expect(study.title).toBeDefined();
      expect(["supports", "refutes", "neutral"]).toContain(study.stance);
    }
  });
});
