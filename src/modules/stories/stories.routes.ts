import { Router } from "express";
import { StoryController, PetCategoryController } from "./stories.controller";
import {
  StoryService,
  PetCategoryService,
} from "./stories.service";
import {
  PrismaStoryRepository,
  PrismaPetCategoryRepository,
} from "./stories.repository";
import { storyIdParamsSchema } from "./stories.schema";
import { validateRequest } from "../../core/middleware/validate-request";

export function createStoriesRouter(
  storyService: StoryService = new StoryService(new PrismaStoryRepository())
): Router {
  const router = Router();
  const controller = new StoryController(storyService);

  router.get("/", controller.getStories);
  router.get(
    "/:id",
    validateRequest({ params: storyIdParamsSchema }),
    controller.getStoryById
  );

  return router;
}

export function createPetCategoriesRouter(
  petCategoryService: PetCategoryService = new PetCategoryService(
    new PrismaPetCategoryRepository()
  )
): Router {
  const router = Router();
  const controller = new PetCategoryController(petCategoryService);

  router.get("/", controller.getPetCategories);

  return router;
}
