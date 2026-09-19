import { PrismaClient, SuccessStory, PetCategory } from "@prisma/client";
import { prisma } from "../../core/db/prisma";

export interface StoryRepository {
  findAll(): Promise<SuccessStory[]>;
  findById(id: string): Promise<SuccessStory | null>;
}

export interface PetCategoryRepository {
  findAll(): Promise<PetCategory[]>;
}

export class PrismaStoryRepository implements StoryRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findAll(): Promise<SuccessStory[]> {
    return this.db.successStory.findMany({ orderBy: { createdAt: "asc" } });
  }

  async findById(id: string): Promise<SuccessStory | null> {
    return this.db.successStory.findUnique({ where: { id } });
  }
}

export class PrismaPetCategoryRepository implements PetCategoryRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findAll(): Promise<PetCategory[]> {
    return this.db.petCategory.findMany({ orderBy: { createdAt: "asc" } });
  }
}
