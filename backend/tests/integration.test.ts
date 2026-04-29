import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus, connectWebSocket, connectAuthenticatedWebSocket, waitForMessage } from "./helpers";

describe("API Integration Tests", () => {
  // POST /api/validate-claim tests
  test("POST /api/validate-claim - successful validation with 200 response", async () => {
    const res = await api("/api/validate-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: "The Earth is round" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.verdict).toBeDefined();
    expect(["VALID", "INVALID", "INCONCLUSIVE"]).toContain(data.verdict);
    expect(data.confidence).toBeDefined();
    expect(data.summary).toBeDefined();
    expect(Array.isArray(data.studies)).toBe(true);
  });

  test("POST /api/validate-claim - returns statistics in response", async () => {
    const res = await api("/api/validate-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: "Water boils at 100 degrees Celsius at sea level" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.supporting_count).toBeDefined();
    expect(data.refuting_count).toBeDefined();
    expect(data.total_count).toBeDefined();
    expect(data.supporting_pct).toBeDefined();
    expect(data.refuting_pct).toBeDefined();
  });

  test("POST /api/validate-claim - returns weighted scores in response", async () => {
    const res = await api("/api/validate-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: "Climate change is caused by human activities" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.weighted_supporting).toBeDefined();
    expect(data.weighted_refuting).toBeDefined();
    expect(data.total_weight).toBeDefined();
  });

  test("POST /api/validate-claim - missing required claim field returns 400", async () => {
    const res = await api("/api/validate-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/validate-claim - empty claim string returns 400", async () => {
    const res = await api("/api/validate-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: "" }),
    });
    await expectStatus(res, 400);
  });

  // POST /api/validate-claim/deeper tests
  test("POST /api/validate-claim/deeper - successful validation with 200 response", async () => {
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

  test("POST /api/validate-claim/deeper - missing required claim field returns 400", async () => {
    const res = await api("/api/validate-claim/deeper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/validate-claim/deeper - empty claim string returns 400", async () => {
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

  test("POST /api/validate-claim/deeper - with offset parameter", async () => {
    const res = await api("/api/validate-claim/deeper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim: "The Earth is round",
        offset: 5,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.studies)).toBe(true);
    expect(data.new_count).toBeDefined();
    expect(typeof data.new_count).toBe("number");
  });

  test("POST /api/validate-claim/deeper - with regenerate_summary parameter", async () => {
    const res = await api("/api/validate-claim/deeper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim: "Water boils at 100 degrees Celsius",
        regenerate_summary: true,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.studies)).toBe(true);
    expect(data.new_count).toBeDefined();
  });

  test("POST /api/validate-claim/deeper - with all_studies_context parameter", async () => {
    const res = await api("/api/validate-claim/deeper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim: "Climate change is real",
        all_studies_context: [
          {
            title: "Study A",
            stance: "supports",
            key_finding: "Evidence supports the claim",
          },
        ],
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.studies)).toBe(true);
    expect(data.new_count).toBeDefined();
  });

  test("POST /api/validate-claim/deeper - studies include required fields", async () => {
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

  // POST /api/emergency-check tests
  test("POST /api/emergency-check - successful triage assessment with 200 response", async () => {
    const res = await api("/api/emergency-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: "Patient has chest pain and shortness of breath" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.recommendation).toBeDefined();
    expect(["GO_TO_ER", "GO_TO_CLINIC", "TREAT_AT_HOME"]).toContain(data.recommendation);
    expect(data.urgency_score).toBeDefined();
    expect(typeof data.urgency_score).toBe("number");
    expect(data.urgency_score).toBeGreaterThanOrEqual(1);
    expect(data.urgency_score).toBeLessThanOrEqual(10);
    expect(data.confidence).toBeDefined();
    expect(typeof data.confidence).toBe("number");
  });

  test("POST /api/emergency-check - returns complete assessment fields", async () => {
    const res = await api("/api/emergency-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: "Patient has mild headache" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.reasoning).toBeDefined();
    expect(typeof data.reasoning).toBe("string");
    expect(Array.isArray(data.warning_signs)).toBe(true);
    expect(Array.isArray(data.home_treatment)).toBe(true);
    expect(data.disclaimer).toBeDefined();
    expect(typeof data.disclaimer).toBe("string");
  });

  test("POST /api/emergency-check - missing required situation field returns 400", async () => {
    const res = await api("/api/emergency-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/emergency-check - empty situation string returns 400", async () => {
    const res = await api("/api/emergency-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: "" }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/emergency-check - high severity situation assessment", async () => {
    const res = await api("/api/emergency-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: "Patient is unconscious and not breathing" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.recommendation).toBe("GO_TO_ER");
    expect(data.urgency_score).toBeGreaterThan(5);
  });

  test("POST /api/emergency-check - minor issue assessment", async () => {
    const res = await api("/api/emergency-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: "Patient has a small cut on finger" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.urgency_score).toBeLessThan(7);
  });
});
