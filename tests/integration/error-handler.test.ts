import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { z } from "zod";
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../src/core/errors/app-error";
import { errorHandler } from "../../src/core/middleware/error-handler";

describe("Global Error Handler Middleware", () => {
  const app = express();
  app.use(express.json());

  app.get("/test/not-found", () => {
    throw new NotFoundError("Resource missing");
  });

  app.get("/test/unauthorized", () => {
    throw new UnauthorizedError("Invalid token");
  });

  app.get("/test/validation-app-error", () => {
    throw new ValidationError("Input invalid", [{ field: "name", message: "Required" }]);
  });

  app.get("/test/zod-error", () => {
    const schema = z.object({ age: z.number() });
    schema.parse({ age: "not-a-number" });
  });

  app.get("/test/uncaught-error", () => {
    throw new Error("Unexpected database explosion");
  });

  app.use(errorHandler);

  it("handles NotFoundError with 404 and structured json", async () => {
    const response = await request(app).get("/test/not-found");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Resource missing",
    });
  });

  it("handles UnauthorizedError with 401 and structured json", async () => {
    const response = await request(app).get("/test/unauthorized");
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid token",
    });
  });

  it("handles ValidationError with 400 and attached details", async () => {
    const response = await request(app).get("/test/validation-app-error");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Input invalid",
      errors: [{ field: "name", message: "Required" }],
    });
  });

  it("handles ZodError with 400 and parsed validation issues", async () => {
    const response = await request(app).get("/test/zod-error");
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation error");
    expect(Array.isArray(response.body.errors)).toBe(true);
  });

  it("handles unhandled generic errors with 500 without leaking stack traces", async () => {
    const response = await request(app).get("/test/uncaught-error");
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      message: "Internal server error",
    });
  });
});
