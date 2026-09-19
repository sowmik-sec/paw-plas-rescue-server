import { SuccessStory, PetCategory } from "@prisma/client";
import { NotFoundError } from "../../core/errors/app-error";
import { StoryRepository, PetCategoryRepository } from "./stories.repository";

export class StoryService {
  constructor(private readonly storyRepository: StoryRepository) {}

  async getAllStories(): Promise<SuccessStory[]> {
    return this.storyRepository.findAll();
  }

  async getStoryById(id: string): Promise<SuccessStory> {
    const story = await this.storyRepository.findById(id);

    if (!story) {
      throw new NotFoundError(`Success story not found: ${id}`);
    }

    return story;
  }
}

export class PetCategoryService {
  constructor(private readonly petCategoryRepository: PetCategoryRepository) {}

  async getAllCategories(): Promise<PetCategory[]> {
    return this.petCategoryRepository.findAll();
  }
}
