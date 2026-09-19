import { describe, it, expect } from "vitest";
import { SuccessStory } from "@prisma/client";
import { StoryService } from "../../src/modules/stories/stories.service";
import { StoryRepository } from "../../src/modules/stories/stories.repository";
import { NotFoundError } from "../../src/core/errors/app-error";

class InMemoryStoryRepository implements StoryRepository {
  constructor(private readonly stories: SuccessStory[]) {}

  async findAll(): Promise<SuccessStory[]> {
    return this.stories;
  }

  async findById(id: string): Promise<SuccessStory | null> {
    return this.stories.find((story) => story.id === id) ?? null;
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

describe("StoryService (Domain Module Service Seam)", () => {
  const story = buildStory();
  let service: StoryService;

  describe("getAllStories", () => {
    it("returns every published success story", async () => {
      service = new StoryService(new InMemoryStoryRepository([story]));

      const stories = await service.getAllStories();

      expect(stories).toEqual([story]);
    });

    it("returns an empty list when no stories are published", async () => {
      service = new StoryService(new InMemoryStoryRepository([]));

      const stories = await service.getAllStories();

      expect(stories).toEqual([]);
    });
  });

  describe("getStoryById", () => {
    it("returns the success story matching the identifier", async () => {
      service = new StoryService(
        new InMemoryStoryRepository([story, buildStory({ id: "650e8b8c1c9d440000a1b2c4", name: "Luna" })])
      );

      const found = await service.getStoryById("650e8b8c1c9d440000a1b2c4");

      expect(found.name).toBe("Luna");
    });

    it("throws NotFoundError when no story exists for the identifier", async () => {
      service = new StoryService(new InMemoryStoryRepository([story]));

      await expect(service.getStoryById("650e8b8c1c9d440000a1b2ff")).rejects.toThrow(NotFoundError);
    });
  });
});
