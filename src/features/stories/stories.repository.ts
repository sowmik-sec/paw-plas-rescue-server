import { prisma as defaultPrisma } from "../../core/db/prisma";
import { PrismaClient, SuccessStory, PetCategory } from "@prisma/client";

export interface IStoriesRepository {
  findAll(): Promise<SuccessStory[]>;
  findById(id: string): Promise<SuccessStory | null>;
}

export interface IPetCategoriesRepository {
  findAll(): Promise<PetCategory[]>;
}

export class StoriesRepository implements IStoriesRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  async findAll(): Promise<SuccessStory[]> {
    // Insertion order keeps the home page feed stable, matching legacy natural order
    return this.prisma.successStory.findMany({
      orderBy: { createdAt: "asc" },
    });
  }

  async findById(id: string): Promise<SuccessStory | null> {
    return this.prisma.successStory.findUnique({
      where: { id },
    });
  }
}

export class PetCategoriesRepository implements IPetCategoriesRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  async findAll(): Promise<PetCategory[]> {
    return this.prisma.petCategory.findMany({
      orderBy: { createdAt: "asc" },
    });
  }
}

export const storiesRepository = new StoriesRepository();
export const petCategoriesRepository = new PetCategoriesRepository();
