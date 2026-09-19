import { describe, it, expect } from "vitest";
import { validateEnv } from "../../src/core/config/env";

describe("Environment Configuration Seam", () => {
  const validEnv = {
    DATABASE_URL: "mongodb+srv://user:pass@cluster.mongodb.net/test?retryWrites=true&w=majority",
    ACCESS_TOKEN_SECRET: "super-secret-jwt-token",
  };

  it("successfully parses valid environment variables with default values", () => {
    const config = validateEnv(validEnv);

    expect(config.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(config.ACCESS_TOKEN_SECRET).toBe(validEnv.ACCESS_TOKEN_SECRET);
    expect(config.PORT).toBe(5000);
    expect(config.NODE_ENV).toBe("development");
    expect(config.CLIENT_URL).toBe("http://localhost:5173");
  });

  it("coerces string PORT to number and respects custom NODE_ENV", () => {
    const config = validateEnv({
      ...validEnv,
      PORT: "8080",
      NODE_ENV: "production",
      CLIENT_URL: "https://paw-pals-rescue.web.app",
      STRIPE_SECRET_KEY: "sk_test_12345",
    });

    expect(config.PORT).toBe(8080);
    expect(config.NODE_ENV).toBe("production");
    expect(config.CLIENT_URL).toBe("https://paw-pals-rescue.web.app");
    expect(config.STRIPE_SECRET_KEY).toBe("sk_test_12345");
  });

  it("throws a descriptive error when required DATABASE_URL is missing", () => {
    expect(() =>
      validateEnv({
        ACCESS_TOKEN_SECRET: "secret",
      })
    ).toThrow(/DATABASE_URL/);
  });

  it("throws a descriptive error when required ACCESS_TOKEN_SECRET is missing", () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: "mongodb://localhost:27017/test",
      })
    ).toThrow(/ACCESS_TOKEN_SECRET/);
  });
});
