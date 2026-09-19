import { Request, Response, NextFunction } from "express";
import {
  StoriesService,
  PetCategoriesService,
  storiesService as defaultStoriesService,
  petCategoriesService as defaultPetCategoriesService,
} from "./stories.service";
import { SuccessStory, PetCategory } from "@prisma/client";

// Legacy clients key off _id; keep it alongside the Prisma-mapped id field
function serializeStory(story: SuccessStory): SuccessStory & { _id: string } {
  return {
    ...story,
    _id: story.id,
  };
}

function serializeCategory(
  category: PetCategory
): PetCategory & { _id: string } {
  return {
    ...category,
    _id: category.id,
  };
}

export class StoriesController {
  private storiesService: StoriesService;

  constructor(storiesSvc?: StoriesService) {
    this.storiesService = storiesSvc || defaultStoriesService;
  }

  public getAll = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stories = await this.storiesService.getAllStories();
      res.status(200).json(stories.map(serializeStory));
    } catch (error) {
      next(error);
    }
  };

  public getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const story = await this.storiesService.getStoryById(req.params.id);
      res.status(200).json(serializeStory(story));
    } catch (error) {
      next(error);
    }
  };
}

export class PetCategoriesController {
  private petCategoriesService: PetCategoriesService;

  constructor(petCategoriesSvc?: PetCategoriesService) {
    this.petCategoriesService = petCategoriesSvc || defaultPetCategoriesService;
  }

  public getAll = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const categories = await this.petCategoriesService.getAllCategories();
      res.status(200).json(categories.map(serializeCategory));
    } catch (error) {
      next(error);
    }
  };
}

export const storiesController = new StoriesController();
export const petCategoriesController = new PetCategoriesController();
