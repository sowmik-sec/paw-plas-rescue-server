import { describe, it, expect } from "vitest";
import { AuthService } from "../../src/features/auth/auth.service";
import { UnauthorizedError } from "../../src/core/errors/app-error";

describe("AuthService Unit Seam", () => {
  const secret = "test-jwt-secret-key-12345";
  const authService = new AuthService(secret);

  it("generates a valid signed JWT token for a given email", () => {
    const payload = { email: "user@example.com" };
    const token = authService.generateToken(payload);

    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);
  });

  it("verifies and decodes a valid token payload", () => {
    const payload = { email: "user@example.com" };
    const token = authService.generateToken(payload);
    const decoded = authService.verifyToken(token);

    expect(decoded.email).toBe(payload.email);
    expect(decoded.exp).toBeDefined();
  });

  it("throws UnauthorizedError when verifying an invalid token", () => {
    expect(() => authService.verifyToken("invalid.token.signature")).toThrow(
      UnauthorizedError
    );
  });

  it("throws UnauthorizedError when verifying a token signed with a different secret", () => {
    const otherService = new AuthService("different-secret-key");
    const token = otherService.generateToken({ email: "user@example.com" });

    expect(() => authService.verifyToken(token)).toThrow(UnauthorizedError);
  });
});
