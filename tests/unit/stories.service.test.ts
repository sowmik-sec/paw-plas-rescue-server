import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  StoriesService,
  PetCategoriesService,
} from "../../src/features/stories/stories.service";
import { NotFoundError } from "../../src/core/errors/app-error";

describe("Stories Feature Service Seam", () => {
  describe("StoriesService", () => {
    const mockStoriesRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
    };

    let storiesService: StoriesService;

    beforeEach(() => {
      vi.clearAllMocks();
      storiesService = new StoriesService(mockStoriesRepository as any);
    });

    it("returns every published success story", async () => {
      const stories = [
        {
          id: "650e8b8c1c9d440000a1b2c3",
          name: "Buddy",
          image: "https://example.com/buddy.jpg",
          story: "Buddy found a forever home with the Rahman family.",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockStoriesRepository.findAll.mockResolvedValue(stories);

      const result = await storiesService.getAllStories();

      expect(mockStoriesRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(stories);
    });

    it("returns an empty list when no stories are published", async () => {
      mockStoriesRepository.findAll.mockResolvedValue([]);

      const result = await storiesService.getAllStories();

      expect(result).toEqual([]);
    });

    it("returns the success story matching the identifier", async () => {
      const story = {
        id: "650e8b8c1c9d440000a1b2c4",
        name: "Luna",
        image: "https://example.com/luna.jpg",
        story: "Luna now rules a quiet home in Dhaka.",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStoriesRepository.findById.mockResolvedValue(story);

      const result = await storiesService.getStoryById(story.id);

      expect(mockStoriesRepository.findById).toHaveBeenCalledWith(story.id);
      expect(result.name).toBe("Luna");
    });

    it("throws NotFoundError when no story exists for the identifier", async () => {
      mockStoriesRepository.findById.mockResolvedValue(null);

      await expect(
        storiesService.getStoryById("650e8b8c1c9d440000a1b2ff")
      ).rejects.toThrow(NotFoundError);
      expect(mockStoriesRepository.findById).toHaveBeenCalledWith(
        "650e8b8c1c9d440000a1b2ff"
      );
    });
  });

  describe("PetCategoriesService", () => {
    const mockPetCategoriesRepository = {
      findAll: vi.fn(),
    };

    let petCategoriesService: PetCategoriesService;

    beforeEach(() => {
      vi.clearAllMocks();
      petCategoriesService = new PetCategoriesService(
        mockPetCategoriesRepository as any
      );
    });

    it("returns every pet category with its display icon", async () => {
      const categories = [
        {
          id: "650e8b8c1c9d440000d1e2f3",
          name: "Dogs",
          image: "https://example.com/dogs-icon.png",
          description: "Loyal companions waiting for a home",
          link: "dog",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "650e8b8c1c9d440000d1e2f4",
          name: "Cats",
          image: "https://example.com/cats-icon.png",
          description: null,
          link: "cat",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPetCategoriesRepository.findAll.mockResolvedValue(categories);

      const result = await petCategoriesService.getAllCategories();

      expect(mockPetCategoriesRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(categories);
      expect(result.every((category) => typeof category.image === "string")).toBe(
        true
      );
    });

    it("returns an empty list when no categories exist", async () => {
      mockPetCategoriesRepository.findAll.mockResolvedValue([]);

      const result = await petCategoriesService.getAllCategories();

      expect(result).toEqual([]);
    });
  });
});
