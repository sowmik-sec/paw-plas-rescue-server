import { describe, it, expect } from "vitest";
import request from "supertest";
import { SuccessStory, PetCategory } from "@prisma/client";
import { createApp } from "../../src/app";
import { StoryService, PetCategoryService } from "../../src/modules/stories/stories.service";
import {
  StoryRepository,
  PetCategoryRepository,
} from "../../src/modules/stories/stories.repository";

class InMemoryStoryRepository implements StoryRepository {
  constructor(private readonly stories: SuccessStory[]) {}

  async findAll(): Promise<SuccessStory[]> {
    return this.stories;
  }

  async findById(id: string): Promise<SuccessStory | null> {
    return this.stories.find((story) => story.id === id) ?? null;
  }
}

class InMemoryPetCategoryRepository implements PetCategoryRepository {
  constructor(private readonly categories: PetCategory[]) {}

  async findAll(): Promise<PetCategory[]> {
    return this.categories;
  }
}

const buildStory = (overrides: Partial<SuccessStory> = {}): SuccessStory => ({
  id: "650e8b8c1c9d440000a1b2c3",
  name: "Buddy",
  image: "https://example.com/buddy.jpg",
  story: "Buddy found a forever home with the Rahman family.",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

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

const buildApp = (stories: SuccessStory[] = [], categories: PetCategory[] = []) =>
  createApp({
    storyService: new StoryService(new InMemoryStoryRepository(stories)),
    petCategoryService: new PetCategoryService(new InMemoryPetCategoryRepository(categories)),
  });

describe("Stories Module REST Transport Seam", () => {
  describe("GET /api/v1/stories", () => {
    it("returns 200 with all success stories enveloped in data", async () => {
      const stories = [
        buildStory(),
        buildStory({ id: "650e8b8c1c9d440000a1b2c4", name: "Luna" }),
      ];
      const response = await request(buildApp(stories)).get("/api/v1/stories");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toMatchObject({ id: stories[0].id, name: "Buddy" });
    });

    it("returns 200 with an empty list when no stories are published", async () => {
      const response = await request(buildApp()).get("/api/v1/stories");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: [] });
    });
  });

  describe("GET /api/v1/stories/:id", () => {
    it("returns 200 with the requested story", async () => {
      const story = buildStory({ id: "650e8b8c1c9d440000a1b2c4", name: "Luna" });
      const response = await request(buildApp([story])).get(`/api/v1/stories/${story.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: JSON.parse(JSON.stringify(story)) });
    });

    it("returns 404 structured error when the story does not exist", async () => {
      const response = await request(buildApp([buildStory()])).get(
        "/api/v1/stories/650e8b8c1c9d440000a1b2ff"
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: "Success story not found: 650e8b8c1c9d440000a1b2ff",
      });
    });

    it("returns 400 structured error when the identifier is malformed", async () => {
      const response = await request(buildApp()).get("/api/v1/stories/not-a-valid-id");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Validation error");
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });

  describe("GET /api/v1/pets/categories", () => {
    it("returns 200 with all pet categories and their display icons", async () => {
      const categories = [
        buildCategory(),
        buildCategory({ id: "650e8b8c1c9d440000d1e2f4", name: "Cats" }),
      ];
      const response = await request(buildApp([], categories)).get("/api/v1/pets/categories");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(JSON.parse(JSON.stringify(categories)));
    });

    it("returns 200 with an empty list when no categories exist", async () => {
      const response = await request(buildApp()).get("/api/v1/pets/categories");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: [] });
    });
  });
});
