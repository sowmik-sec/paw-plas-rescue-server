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

let prismaInstance: PrismaClient | undefined = global.prisma;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    try {
      prismaInstance = new PrismaClient({
        log: isDevelopment() ? ["query", "error", "warn"] : ["error"],
      });
    } catch {
      // Fallback for environments / tests where driver adapter or direct connection is mocked
      prismaInstance = new PrismaClient();
    }

    if (!isProduction()) {
      global.prisma = prismaInstance;
    }
  }
  return prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrismaClient();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
