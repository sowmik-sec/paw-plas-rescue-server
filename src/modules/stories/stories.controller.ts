import { Request, Response, NextFunction } from "express";
import { StoryService, PetCategoryService } from "./stories.service";

export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  getStories = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stories = await this.storyService.getAllStories();
      res.status(200).json({ success: true, data: stories });
    } catch (error) {
      next(error);
    }
  };

  getStoryById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const story = await this.storyService.getStoryById(req.params.id);
      res.status(200).json({ success: true, data: story });
    } catch (error) {
      next(error);
    }
  };
}

export class PetCategoryController {
  constructor(private readonly petCategoryService: PetCategoryService) {}

  getPetCategories = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const categories = await this.petCategoryService.getAllCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  };
}
