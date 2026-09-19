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
  createStoriesRouter,
  createPetCategoriesRouter,
} from "./modules/stories/stories.routes";
import { StoryService, PetCategoryService } from "./modules/stories/stories.service";

export interface AppOptions {
  authRouter?: express.Router;
  usersRouter?: express.Router;
  storyService?: StoryService;
  petCategoryService?: PetCategoryService;
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
  const storiesRouter = createStoriesRouter(options?.storyService);
  const petCategoriesRouter = createPetCategoriesRouter(options?.petCategoryService);

  app.use("/api/v1/auth", authRouter);
  app.use("/jwt", authRouter);

  app.use("/api/v1/users", usersRouter);
  app.use("/users", usersRouter);

  app.use("/api/v1/stories", storiesRouter);
  app.use("/successStories", storiesRouter);

  app.use("/api/v1/pets/categories", petCategoriesRouter);
  app.use("/petCategories", petCategoriesRouter);

  // Catch-all 404 for unhandled routes
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route not found: ${req.originalUrl}`));
  });

  // Global centralized error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
