import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import {
  StoriesService,
  PetCategoriesService,
} from "../../src/features/stories/stories.service";
import {
  StoriesController,
  PetCategoriesController,
} from "../../src/features/stories/stories.controller";
import {
  createStoriesRouter,
  createPetCategoriesRouter,
} from "../../src/features/stories/stories.routes";

describe("Stories Feature HTTP Seam", () => {
  const mockStoriesRepo = {
    findAll: vi.fn(),
    findById: vi.fn(),
  };

  const mockPetCategoriesRepo = {
    findAll: vi.fn(),
  };

  const storiesController = new StoriesController(
    new StoriesService(mockStoriesRepo as any)
  );
  const petCategoriesController = new PetCategoriesController(
    new PetCategoriesService(mockPetCategoriesRepo as any)
  );

  const app = createApp({
    storiesRouter: createStoriesRouter({ controller: storiesController }),
    petCategoriesRouter: createPetCategoriesRouter({
      controller: petCategoriesController,
    }),
  });

  const story = {
    id: "650e8b8c1c9d440000a1b2c3",
    name: "Buddy",
    image: "https://example.com/buddy.jpg",
    story: "Buddy found a forever home with the Rahman family.",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  const category = {
    id: "650e8b8c1c9d440000d1e2f3",
    name: "Dogs",
    image: "https://example.com/dogs-icon.png",
    description: "Loyal companions waiting for a home",
    link: "dog",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/stories", () => {
    it("returns 200 with all success stories on the RESTful path", async () => {
      mockStoriesRepo.findAll.mockResolvedValue([story]);

      const response = await request(app).get("/api/v1/stories");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ id: story.id, name: "Buddy" });
    });

    it("returns 200 with an empty list when no stories are published", async () => {
      mockStoriesRepo.findAll.mockResolvedValue([]);

      const response = await request(app).get("/api/v1/stories");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("keeps serving the legacy /success-stories path", async () => {
      mockStoriesRepo.findAll.mockResolvedValue([story]);

      const response = await request(app).get("/success-stories");

      expect(response.status).toBe(200);
      expect(response.body[0]._id).toBe(story.id);
    });
  });

  describe("GET /api/v1/stories/:id", () => {
    it("returns 200 with the requested story including legacy _id field", async () => {
      mockStoriesRepo.findById.mockResolvedValue(story);

      const response = await request(app).get(`/api/v1/stories/${story.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: story.id,
        _id: story.id,
        name: "Buddy",
        image: story.image,
        story: story.story,
      });
      expect(mockStoriesRepo.findById).toHaveBeenCalledWith(story.id);
    });

    it("keeps serving the legacy /stories/:id path", async () => {
      mockStoriesRepo.findById.mockResolvedValue(story);

      const response = await request(app).get(`/stories/${story.id}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(story.id);
    });

    it("returns 404 structured error when the story does not exist", async () => {
      mockStoriesRepo.findById.mockResolvedValue(null);

      const response = await request(app).get(
        "/api/v1/stories/650e8b8c1c9d440000a1b2ff"
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: "Success story not found with id: 650e8b8c1c9d440000a1b2ff",
      });
    });

    it("returns 400 structured error when the identifier is malformed", async () => {
      const response = await request(app).get("/api/v1/stories/not-a-valid-id");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Validation error");
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(mockStoriesRepo.findById).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/pets/categories", () => {
    it("returns 200 with all pet categories and their display icons", async () => {
      const categories = [
        category,
        { ...category, id: "650e8b8c1c9d440000d1e2f4", name: "Cats" },
      ];
      mockPetCategoriesRepo.findAll.mockResolvedValue(categories);

      const response = await request(app).get("/api/v1/pets/categories");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        id: category.id,
        _id: category.id,
        name: "Dogs",
        image: category.image,
      });
    });

    it("keeps serving the legacy /pet-categories path", async () => {
      mockPetCategoriesRepo.findAll.mockResolvedValue([category]);

      const response = await request(app).get("/pet-categories");

      expect(response.status).toBe(200);
      expect(response.body[0]._id).toBe(category.id);
    });

    it("returns 200 with an empty list when no categories exist", async () => {
      mockPetCategoriesRepo.findAll.mockResolvedValue([]);

      const response = await request(app).get("/api/v1/pets/categories");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });
});
