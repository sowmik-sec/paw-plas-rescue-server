import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { errorHandler } from "./core/middleware/error-handler";
import { NotFoundError } from "./core/errors/app-error";

// Node 22+ compatibility polyfill for packages accessing SlowBuffer
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeBuffer = require("node:buffer");
  if (!nodeBuffer.SlowBuffer) {
    nodeBuffer.SlowBuffer = nodeBuffer.Buffer;
  }
} catch {
  // ignore
}

import { authRouter as defaultAuthRouter } from "./features/auth/auth.routes";
import { usersRouter as defaultUsersRouter } from "./features/users/users.routes";
import {
  storiesRouter as defaultStoriesRouter,
  petCategoriesRouter as defaultPetCategoriesRouter,
} from "./features/stories/stories.routes";
import {
  petsRouter as defaultPetsRouter,
  legacyPetsRouter as defaultLegacyPetsRouter,
} from "./features/pets/pets.routes";
import {
  adoptionsRouter as defaultAdoptionsRouter,
  legacyAdoptionsRouter as defaultLegacyAdoptionsRouter,
} from "./features/adoptions/adoptions.routes";

export interface AppOptions {
  authRouter?: express.Router;
  usersRouter?: express.Router;
  storiesRouter?: express.Router;
  petCategoriesRouter?: express.Router;
  petsRouter?: express.Router;
  legacyPetsRouter?: express.Router;
  adoptionsRouter?: express.Router;
  legacyAdoptionsRouter?: express.Router;
}

export function createApp(options?: AppOptions): Express {
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

  // Feature routers
  const authRouter = options?.authRouter || defaultAuthRouter;
  const usersRouter = options?.usersRouter || defaultUsersRouter;
  const storiesRouter = options?.storiesRouter || defaultStoriesRouter;
  const petCategoriesRouter =
    options?.petCategoriesRouter || defaultPetCategoriesRouter;
  const petsRouter = options?.petsRouter || defaultPetsRouter;
  const legacyPetsRouter =
    options?.legacyPetsRouter || defaultLegacyPetsRouter;
  const adoptionsRouter =
    options?.adoptionsRouter || defaultAdoptionsRouter;
  const legacyAdoptionsRouter =
    options?.legacyAdoptionsRouter || defaultLegacyAdoptionsRouter;

  app.use("/api/v1/auth", authRouter);
  app.use("/jwt", authRouter);

  app.use("/api/v1/users", usersRouter);
  app.use("/users", usersRouter);

  app.use("/api/v1/stories", storiesRouter);
  app.use("/stories", storiesRouter);
  app.use("/success-stories", storiesRouter);

  // Static /categories route mounted before /api/v1/pets so it takes precedence over /:id
  app.use("/api/v1/pets/categories", petCategoriesRouter);
  app.use("/pet-categories", petCategoriesRouter);

  app.use("/api/v1/pets", petsRouter);
  app.use("/api/v1/adoptions", adoptionsRouter);
  app.use("/api/v1/adoption-requests", adoptionsRouter);
  app.use("/", legacyPetsRouter);
  app.use("/", legacyAdoptionsRouter);

  // Catch-all 404 for unhandled routes
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route not found: ${req.originalUrl}`));
  });

  // Global centralized error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
