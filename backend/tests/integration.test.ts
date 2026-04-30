import { describe, test, expect } from "bun:test";
import { api, expectStatus } from "./helpers";

describe("API Integration Tests", () => {
  // ============================================================================
  // /api/validate-claim - Validate scientific claims
  // ============================================================================

  test("POST /api/validate-claim with valid claim", async () => {
    const res = await api("/api/validate-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: "Water is essential for human survival" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.verdict).toBeDefined();
    expect(["VALID", "INVALID", "INCONCLUSIVE"]).toContain(data.verdict);
  });

  test("POST /api/validate-claim with empty claim string returns 400", async () => {
    const res = await api("/api/validate-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: "" }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/validate-claim with missing claim field returns 400", async () => {
    const res = await api("/api/validate-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  // ============================================================================
  // /api/validate-claim/deeper - Deeper validation with pagination support
  // ============================================================================

  test("POST /api/validate-claim/deeper with valid claim", async () => {
    const res = await api("/api/validate-claim/deeper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: "Exercise improves cardiovascular health" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.studies).toBeDefined();
    expect(Array.isArray(data.studies)).toBe(true);
    expect(data.found_new).toBeDefined();
    expect(typeof data.found_new).toBe("boolean");
  });

  test("POST /api/validate-claim/deeper with offset parameter", async () => {
    const res = await api("/api/validate-claim/deeper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim: "Sleep is important for health",
        offset: 5,
      }),
    });
    await expectStatus(res, 200);
  });

  test("POST /api/validate-claim/deeper with exclude_titles", async () => {
    const res = await api("/api/validate-claim/deeper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim: "Vitamin C boosts immunity",
        exclude_titles: ["Study 1", "Study 2"],
      }),
    });
    await expectStatus(res, 200);
  });

  test("POST /api/validate-claim/deeper with missing claim returns 400", async () => {
    const res = await api("/api/validate-claim/deeper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offset: 10 }),
    });
    await expectStatus(res, 400);
  });

  // ============================================================================
  // /api/emergency-check - Emergency medical triage assessment
  // ============================================================================

  test("POST /api/emergency-check with valid situation", async () => {
    const res = await api("/api/emergency-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: "Patient has severe chest pain" }),
    });
    await expectStatus(res, 200);
  });

  test("POST /api/emergency-check with answers array", async () => {
    const res = await api("/api/emergency-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        situation: "Patient reports persistent fever",
        answers: [
          { question: "How long has the fever lasted?", answer: "3 days" },
          { question: "Temperature reading?", answer: "101.5°F" },
        ],
      }),
    });
    await expectStatus(res, 200);
  });

  test("POST /api/emergency-check with missing situation returns 400", async () => {
    const res = await api("/api/emergency-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: [] }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/emergency-check with empty situation returns 400", async () => {
    const res = await api("/api/emergency-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: "" }),
    });
    await expectStatus(res, 400);
  });

  // ============================================================================
  // /api/emergency-next-question - Get next clinical assessment question
  // ============================================================================

  test("POST /api/emergency-next-question with valid inputs", async () => {
    const res = await api("/api/emergency-next-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        situation: "Patient reports dizziness and lightheadedness",
        question_number: 1,
      }),
    });
    await expectStatus(res, 200);
  });

  test("POST /api/emergency-next-question with answers array", async () => {
    const res = await api("/api/emergency-next-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        situation: "Patient reports severe headache",
        question_number: 2,
        answers: [
          {
            question: "Pain severity on 1-10 scale?",
            category: "pain",
            answer: "8",
          },
        ],
      }),
    });
    await expectStatus(res, 200);
  });

  test("POST /api/emergency-next-question with missing situation returns 400", async () => {
    const res = await api("/api/emergency-next-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_number: 1 }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/emergency-next-question with missing question_number returns 400", async () => {
    const res = await api("/api/emergency-next-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: "Patient is unwell" }),
    });
    await expectStatus(res, 400);
  });

  // ============================================================================
  // /api/nutrition-myths - Get analyzed nutrition myths
  // ============================================================================

  test("GET /api/nutrition-myths returns array of myths", async () => {
    const res = await api("/api/nutrition-myths", { method: "GET" });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  // ============================================================================
  // /api/nutrition-myths/refresh - Refresh myths cache
  // ============================================================================

  test("POST /api/nutrition-myths/refresh returns updated myths", async () => {
    const res = await api("/api/nutrition-myths/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.myths).toBeDefined();
    expect(Array.isArray(data.myths)).toBe(true);
    expect(data.total).toBeDefined();
    expect(typeof data.total).toBe("number");
  });

  // ============================================================================
  // /api/reviews - Submit a review
  // ============================================================================

  test("POST /api/reviews with valid review submission", async () => {
    const res = await api("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 5, review: "Excellent app, very helpful!" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("POST /api/reviews with different ratings", async () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      const res = await api("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, review: `Rating: ${rating}` }),
      });
      await expectStatus(res, 200);
    }
  });

  test("POST /api/reviews with missing rating returns 400", async () => {
    const res = await api("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review: "Good app" }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/reviews with missing review returns 400", async () => {
    const res = await api("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 4 }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/reviews with rating below minimum returns 400", async () => {
    const res = await api("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 0, review: "Too low" }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/reviews with rating above maximum returns 400", async () => {
    const res = await api("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 6, review: "Too high" }),
    });
    await expectStatus(res, 400);
  });

  // ============================================================================
  // /api/drug-interactions - Analyze drug/substance interactions
  // ============================================================================

  test("POST /api/drug-interactions with two valid substances", async () => {
    const res = await api("/api/drug-interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ substances: ["aspirin", "ibuprofen"] }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(["NONE", "MILD", "MODERATE", "SEVERE"]).toContain(data.severity);
    expect(data.interactions).toBeDefined();
    expect(Array.isArray(data.interactions)).toBe(true);
  });

  test("POST /api/drug-interactions with three substances", async () => {
    const res = await api("/api/drug-interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        substances: ["warfarin", "aspirin", "alcohol"],
      }),
    });
    await expectStatus(res, 200);
  });

  test("POST /api/drug-interactions with single substance returns 400", async () => {
    const res = await api("/api/drug-interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ substances: ["aspirin"] }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/drug-interactions with empty substances array returns 400", async () => {
    const res = await api("/api/drug-interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ substances: [] }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/drug-interactions with missing substances returns 400", async () => {
    const res = await api("/api/drug-interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  // ============================================================================
  // /api/fun-facts - Extract surprising research facts by category
  // ============================================================================

  test("POST /api/fun-facts with medical category", async () => {
    const res = await api("/api/fun-facts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "medical" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.facts).toBeDefined();
    expect(Array.isArray(data.facts)).toBe(true);
    expect(data.total).toBeDefined();
  });

  test("POST /api/fun-facts with various valid categories", async () => {
    const categories = [
      "medical",
      "psychology",
      "physics",
      "computer-science",
      "music",
      "nature",
    ];
    for (const category of categories) {
      const res = await api("/api/fun-facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      await expectStatus(res, 200);
    }
  });

  test("POST /api/fun-facts with seenIds to exclude previous facts", async () => {
    const res = await api("/api/fun-facts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "psychology",
        seenIds: ["fact-001", "fact-002", "fact-003"],
      }),
    });
    await expectStatus(res, 200);
  });

  test("POST /api/fun-facts with invalid category returns 400", async () => {
    const res = await api("/api/fun-facts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "invalid-category" }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/fun-facts with missing category returns 400", async () => {
    const res = await api("/api/fun-facts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/fun-facts with empty seenIds array", async () => {
    const res = await api("/api/fun-facts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "music", seenIds: [] }),
    });
    await expectStatus(res, 200);
  });
});
