import {
  IStoriesRepository,
  IPetCategoriesRepository,
  storiesRepository as defaultStoriesRepository,
  petCategoriesRepository as defaultPetCategoriesRepository,
} from "./stories.repository";
import { NotFoundError } from "../../core/errors/app-error";
import { SuccessStory, PetCategory } from "@prisma/client";

export class StoriesService {
  private storiesRepo: IStoriesRepository;

  constructor(storiesRepository?: IStoriesRepository) {
    this.storiesRepo = storiesRepository || defaultStoriesRepository;
  }

  async getAllStories(): Promise<SuccessStory[]> {
    return this.storiesRepo.findAll();
  }

  async getStoryById(id: string): Promise<SuccessStory> {
    const story = await this.storiesRepo.findById(id);
    if (!story) {
      throw new NotFoundError(`Success story not found with id: ${id}`);
    }
    return story;
  }
}

export class PetCategoriesService {
  private petCategoriesRepo: IPetCategoriesRepository;

  constructor(petCategoriesRepository?: IPetCategoriesRepository) {
    this.petCategoriesRepo =
      petCategoriesRepository || defaultPetCategoriesRepository;
  }

  async getAllCategories(): Promise<PetCategory[]> {
    return this.petCategoriesRepo.findAll();
  }
}

export const storiesService = new StoriesService();
export const petCategoriesService = new PetCategoriesService();
