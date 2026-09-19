import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { errorHandler } from "./core/middleware/error-handler";
import { NotFoundError } from "./core/errors/app-error";

export function createApp(): Express {
  const app = express();

  // Perimeter middlewares
  app.use(cors());
  app.use(express.json());

  // Health and legacy root status endpoints
  app.get("/", (_req: Request, res: Response) => {
    res.send("Paw pals rescue is running!");
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  // Catch-all 404 for unhandled routes
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route not found: ${req.originalUrl}`));
  });

  // Global centralized error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
