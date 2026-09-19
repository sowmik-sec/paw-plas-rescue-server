import { describe, it, expect } from "vitest";
import { PetCategory } from "@prisma/client";
import { PetCategoryService } from "../../src/modules/stories/stories.service";
import { PetCategoryRepository } from "../../src/modules/stories/stories.repository";

class InMemoryPetCategoryRepository implements PetCategoryRepository {
  constructor(private readonly categories: PetCategory[]) {}

  async findAll(): Promise<PetCategory[]> {
    return this.categories;
  }
}

const buildCategory = (overrides: Partial<PetCategory> = {}): PetCategory => ({
  id: "650e8b8c1c9d440000d1e2f3",
  name: "Dogs",
  image: "https://example.com/dogs-icon.png",
  description: "Loyal companions waiting for a home",
  link: "dog",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

describe("PetCategoryService (Domain Module Service Seam)", () => {
  it("returns every pet category with its display icon", async () => {
    const categories = [
      buildCategory(),
      buildCategory({
        id: "650e8b8c1c9d440000d1e2f4",
        name: "Cats",
        image: "https://example.com/cats-icon.png",
      }),
    ];
    const service = new PetCategoryService(new InMemoryPetCategoryRepository(categories));

    const result = await service.getAllCategories();

    expect(result).toEqual(categories);
    expect(result.every((category) => typeof category.image === "string")).toBe(true);
  });

  it("returns an empty list when no categories exist", async () => {
    const service = new PetCategoryService(new InMemoryPetCategoryRepository([]));

    const result = await service.getAllCategories();

    expect(result).toEqual([]);
  });
});
