import { app } from "./app";
import { getEnv } from "./core/config/env";
import { prisma } from "./core/db/prisma";

const env = getEnv();

const server = app.listen(env.PORT, () => {
  console.log(`Paw pals rescue server is listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

const handleShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("Database connection closed.");
      process.exit(0);
    } catch (err) {
      console.error("Error during database disconnection:", err);
      process.exit(1);
    }
  });
};

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));
