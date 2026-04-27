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
    expect(data.total_count).toBeDefined();
  });

  test("POST /api/validate-claim - response includes summary", async () => {
    const res = await api("/api/validate-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: "The sun is a star" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.summary).toBeDefined();
    expect(typeof data.summary).toBe("string");
  });
});
