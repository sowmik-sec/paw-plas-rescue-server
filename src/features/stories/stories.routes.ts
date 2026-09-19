import { Router } from "express";
import {
  StoriesController,
  PetCategoriesController,
  storiesController as defaultStoriesController,
  petCategoriesController as defaultPetCategoriesController,
} from "./stories.controller";
import { storyIdParamsSchema } from "./stories.schema";
import { validateRequest } from "../../core/middleware/validate-request";

export interface StoriesRouterOptions {
  controller?: StoriesController;
}

export interface PetCategoriesRouterOptions {
  controller?: PetCategoriesController;
}

export function createStoriesRouter(options: StoriesRouterOptions = {}): Router {
  const router = Router();
  const controller = options.controller || defaultStoriesController;

  // Public: browse all success stories
  router.get("/", controller.getAll);

  // Public: story details; identifier must be a valid ObjectId
  router.get(
    "/:id",
    validateRequest({ params: storyIdParamsSchema }),
    controller.getById
  );

  return router;
}

export function createPetCategoriesRouter(
  options: PetCategoriesRouterOptions = {}
): Router {
  const router = Router();
  const controller = options.controller || defaultPetCategoriesController;

  // Public: browse all pet categories with their display icons
  router.get("/", controller.getAll);

  return router;
}

export const storiesRouter = createStoriesRouter();
export const petCategoriesRouter = createPetCategoriesRouter();
