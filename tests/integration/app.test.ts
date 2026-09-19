import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";

describe("Express Application Bootstrap Seam", () => {
  const app = createApp();

  it("GET / returns running message matching legacy contract", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toBe("Paw pals rescue is running!");
  });

  it("GET /health returns 200 ok JSON with status", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.timestamp).toBeDefined();
  });

  it("includes CORS headers in responses", async () => {
    const response = await request(app).get("/");
    expect(response.headers["access-control-allow-origin"]).toBeDefined();
  });

  it("returns 404 with structured error for unknown routes", async () => {
    const response = await request(app).get("/api/v1/non-existent-route");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Route not found: /api/v1/non-existent-route",
    });
  });
});
