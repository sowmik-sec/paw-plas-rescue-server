import { describe, it, expect } from "vitest";
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
} from "../../src/core/errors/app-error";

describe("AppError Hierarchy", () => {
  it("creates custom AppError with specified status code and operational flag", () => {
    const error = new AppError("Something went wrong", 418);
    expect(error.message).toBe("Something went wrong");
    expect(error.statusCode).toBe(418);
    expect(error.isOperational).toBe(true);
    expect(error instanceof Error).toBe(true);
    expect(error instanceof AppError).toBe(true);
  });

  it("creates BadRequestError with status code 400", () => {
    const error = new BadRequestError("Invalid payload");
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("Invalid payload");
    expect(error.isOperational).toBe(true);
  });

  it("creates UnauthorizedError with status code 401", () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("Unauthorized access");
  });

  it("creates ForbiddenError with status code 403", () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe("Forbidden access");
  });

  it("creates NotFoundError with status code 404", () => {
    const error = new NotFoundError("Pet not found");
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("Pet not found");
  });

  it("creates ConflictError with status code 409", () => {
    const error = new ConflictError("User already exists");
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe("User already exists");
  });

  it("creates ValidationError with status code 400 and structured error details", () => {
    const details = [{ field: "email", message: "Invalid email" }];
    const error = new ValidationError("Validation failed", details);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("Validation failed");
    expect(error.errors).toEqual(details);
  });

  it("creates InternalServerError with status code 500 and isOperational false", () => {
    const error = new InternalServerError("Database crash");
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(false);
  });
});
