import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";

describe("Auth Feature HTTP Seam", () => {
  const app = createApp();

  it("POST /api/v1/auth/jwt generates a signed JWT token for valid email", async () => {
    const response = await request(app)
      .post("/api/v1/auth/jwt")
      .send({ email: "adopter@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.token).toBe("string");
    expect(response.body.token.split(".").length).toBe(3);
  });

  it("POST /jwt generates a signed JWT token on legacy path", async () => {
    const response = await request(app)
      .post("/jwt")
      .send({ email: "donor@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.token).toBe("string");
  });

  it("POST /api/v1/auth/jwt returns 400 when email is missing", async () => {
    const response = await request(app).post("/api/v1/auth/jwt").send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation error");
  });

  it("POST /api/v1/auth/jwt returns 400 when email is invalid", async () => {
    const response = await request(app)
      .post("/api/v1/auth/jwt")
      .send({ email: "invalid-email" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
