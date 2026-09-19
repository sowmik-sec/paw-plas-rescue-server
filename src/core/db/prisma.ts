import { PrismaClient } from "@prisma/client";
import { getEnv } from "../config/env";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const isProduction = (): boolean => {
  try {
    return getEnv().NODE_ENV === "production";
  } catch {
    return process.env.NODE_ENV === "production";
  }
};

const isDevelopment = (): boolean => {
  try {
    return getEnv().NODE_ENV === "development";
  } catch {
    return process.env.NODE_ENV === "development";
  }
};

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: isDevelopment() ? ["query", "error", "warn"] : ["error"],
  });

if (!isProduction()) {
  global.prisma = prisma;
}
