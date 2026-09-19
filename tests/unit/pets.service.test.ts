import { describe, it, expect, beforeEach } from "vitest";
import { PetsService } from "../../src/features/pets/pets.service";
import {
  IPetsRepository,
  PetWithDetails,
  AvailablePetsResult,
} from "../../src/features/pets/pets.repository";
import { MemoryMediaAdapter } from "../../src/core/storage/memory-media.adapter";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../src/core/errors/app-error";
import { Pet, Prisma } from "@prisma/client";

class MockPetsRepository implements IPetsRepository {
  public pets: Pet[] = [];
  public requests: {
    pet_id: string;
    status: string;
    request_date?: string;
    requester_info?: any;
  }[] = [];

  async findAvailablePets(options: {
    category?: string;
    page: number;
    limit: number;
  }): Promise<AvailablePetsResult> {
    const { category, page, limit } = options;
    const requestedPetIds = this.requests.map((r) => r.pet_id);

    let filtered = this.pets.filter((p) => !requestedPetIds.includes(p.id));

    if (category && category.toLowerCase() !== "all") {
      filtered = filtered.filter(
        (p) => p.pet_category.toLowerCase() === category.toLowerCase()
      );
    }

    const totalPets = filtered.length;
    const totalPages = Math.ceil(totalPets / limit) || (totalPets > 0 ? 1 : 0);
    const skip = (page - 1) * limit;
    const paginatedPets = filtered.slice(skip, skip + limit);

    return {
      pets: paginatedPets,
      totalPages,
      currentPage: page,
      totalPets,
    };
  }

  async findById(id: string): Promise<Pet | null> {
    return this.pets.find((p) => p.id === id) || null;
  }

  async findByIdWithDetails(id: string): Promise<PetWithDetails | null> {
    const pet = this.pets.find((p) => p.id === id);
    if (!pet) return null;

    const request = this.requests.find((r) => r.pet_id === id);
    return {
      ...pet,
      requestDetails: request
        ? {
            status: request.status,
            request_date: request.request_date,
            requester_info: request.requester_info,
          }
        : null,
    };
  }

  async create(data: Prisma.PetCreateInput): Promise<Pet> {
    const newPet: Pet = {
      id: `pet-${this.pets.length + 1}`,
      pet_name: data.pet_name,
      pet_category: data.pet_category,
      pet_age: data.pet_age,
      pet_location: data.pet_location,
      pet_description: data.pet_description,
      pet_image: data.pet_image,
      posted_date: data.posted_date,
      owner_info: data.owner_info as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.pets.push(newPet);
    return newPet;
  }

  async update(id: string, data: Prisma.PetUpdateInput): Promise<Pet> {
    const index = this.pets.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error("Record not found");
    }

    const existing = this.pets[index];
    const updated: Pet = {
      ...existing,
      pet_name: (data.pet_name as string) ?? existing.pet_name,
      pet_category: (data.pet_category as string) ?? existing.pet_category,
      pet_age: (data.pet_age as string) ?? existing.pet_age,
      pet_location: (data.pet_location as string) ?? existing.pet_location,
      pet_description:
        (data.pet_description as string) ?? existing.pet_description,
      pet_image: (data.pet_image as string) ?? existing.pet_image,
      posted_date: (data.posted_date as string) ?? existing.posted_date,
      owner_info: (data.owner_info as any) ?? existing.owner_info,
      updatedAt: new Date(),
    };

    this.pets[index] = updated;
    return updated;
  }

  async delete(id: string): Promise<Pet> {
    const index = this.pets.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error("Record not found");
    }
    const [deleted] = this.pets.splice(index, 1);
    return deleted;
  }

  async findByOwnerEmail(email: string): Promise<PetWithDetails[]> {
    const ownerPets = this.pets.filter((p) => p.owner_info.email === email);
    return ownerPets.map((pet) => {
      const req = this.requests.find((r) => r.pet_id === pet.id);
      return {
        ...pet,
        requestDetails: req
          ? {
              status: req.status,
              request_date: req.request_date,
              requester_info: req.requester_info,
            }
          : null,
      };
    });
  }
}

describe("PetsService", () => {
  let mockRepo: MockPetsRepository;
  let mediaStorage: MemoryMediaAdapter;
  let service: PetsService;

  beforeEach(() => {
    mockRepo = new MockPetsRepository();
    mediaStorage = new MemoryMediaAdapter();
    service = new PetsService(mockRepo, mediaStorage);

    // Seed test pets
    mockRepo.pets = [
      {
        id: "pet-1",
        pet_name: "Bella",
        pet_category: "dog",
        pet_age: "2",
        pet_location: "Austin, TX",
        pet_description: "Friendly golden retriever",
        pet_image: "https://mock.com/bella.jpg",
        posted_date: "2026-09-01",
        owner_info: { name: "Alice", email: "alice@example.com" },
        createdAt: new Date("2026-09-01"),
        updatedAt: new Date("2026-09-01"),
      },
      {
        id: "pet-2",
        pet_name: "Luna",
        pet_category: "cat",
        pet_age: "1",
        pet_location: "Seattle, WA",
        pet_description: "Playful kitten",
        pet_image: "https://mock.com/luna.jpg",
        posted_date: "2026-09-05",
        owner_info: { name: "Bob", email: "bob@example.com" },
        createdAt: new Date("2026-09-05"),
        updatedAt: new Date("2026-09-05"),
      },
      {
        id: "pet-3",
        pet_name: "Charlie",
        pet_category: "dog",
        pet_age: "3",
        pet_location: "Denver, CO",
        pet_description: "Energetic husky",
        pet_image: "https://mock.com/charlie.jpg",
        posted_date: "2026-09-10",
        owner_info: { name: "Alice", email: "alice@example.com" },
        createdAt: new Date("2026-09-10"),
        updatedAt: new Date("2026-09-10"),
      },
    ];
  });

  describe("getAvailablePets", () => {
    it("returns paginated available pets without category filter", async () => {
      const result = await service.getAvailablePets({ page: 1, limit: 2 });
      expect(result.pets).toHaveLength(2);
      expect(result.totalPets).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.currentPage).toBe(1);
    });

    it("filters available pets by category", async () => {
      const result = await service.getAvailablePets({
        category: "cat",
        page: 1,
        limit: 10,
      });
      expect(result.pets).toHaveLength(1);
      expect(result.pets[0].pet_name).toBe("Luna");
      expect(result.totalPets).toBe(1);
    });

    it("excludes pets that have active adoption requests", async () => {
      mockRepo.requests.push({ pet_id: "pet-1", status: "pending" });

      const result = await service.getAvailablePets({ page: 1, limit: 10 });
      expect(result.pets).toHaveLength(2);
      expect(result.pets.map((p) => p.id)).not.toContain("pet-1");
      expect(result.totalPets).toBe(2);
    });
  });

  describe("getPetById", () => {
    it("returns pet with details and status", async () => {
      mockRepo.requests.push({
        pet_id: "pet-2",
        status: "pending",
        request_date: "2026-09-12",
        requester_info: {
          name: "Charlie",
          email: "charlie@example.com",
        },
      });

      const pet = await service.getPetById("pet-2");
      expect(pet.id).toBe("pet-2");
      expect(pet.pet_name).toBe("Luna");
      expect(pet.requestDetails?.status).toBe("pending");
    });

    it("throws NotFoundError when pet does not exist", async () => {
      await expect(service.getPetById("non-existent")).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("createPet", () => {
    it("uploads image and creates new pet listing", async () => {
      const file = {
        buffer: Buffer.from("image data"),
        originalname: "max.jpg",
      };

      const result = await service.createPet(
        {
          pet_name: "Max",
          pet_category: "dog",
          pet_age: "4",
          pet_location: "Chicago, IL",
          pet_description: "Loyal dog",
          owner_info: { name: "Alice", email: "alice@example.com" },
        },
        file,
        { email: "alice@example.com", name: "Alice", role: "user" }
      );

      expect(result.pet_name).toBe("Max");
      expect(result.pet_image).toContain("mock-image-1.jpg");
      expect(result.owner_info.email).toBe("alice@example.com");
      expect(mockRepo.pets).toHaveLength(4);
    });

    it("throws ValidationError when image file is missing and no image URL is provided", async () => {
      await expect(
        service.createPet(
          {
            pet_name: "Max",
            pet_category: "dog",
            pet_age: "4",
            pet_location: "Chicago, IL",
            pet_description: "Loyal dog",
          },
          undefined,
          { email: "alice@example.com", name: "Alice", role: "user" }
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("updatePet", () => {
    it("updates pet details retaining existing image if no new file is provided", async () => {
      const updated = await service.updatePet(
        "pet-1",
        {
          pet_name: "Bella Updated",
          pet_age: "3",
        },
        undefined,
        { email: "alice@example.com", name: "Alice", role: "user" }
      );

      expect(updated.pet_name).toBe("Bella Updated");
      expect(updated.pet_age).toBe("3");
      expect(updated.pet_image).toBe("https://mock.com/bella.jpg");
    });

    it("uploads new image when file is provided on update", async () => {
      const file = {
        buffer: Buffer.from("new image"),
        originalname: "bella-new.png",
      };

      const updated = await service.updatePet(
        "pet-1",
        {
          pet_name: "Bella With New Photo",
        },
        file,
        { email: "alice@example.com", name: "Alice", role: "user" }
      );

      expect(updated.pet_name).toBe("Bella With New Photo");
      expect(updated.pet_image).toContain("mock-image-1.png");
    });

    it("throws ForbiddenError when user is not the pet owner", async () => {
      await expect(
        service.updatePet(
          "pet-1",
          { pet_name: "Hacked Name" },
          undefined,
          { email: "stranger@example.com", name: "Stranger", role: "user" }
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it("allows admin to update any pet listing", async () => {
      const updated = await service.updatePet(
        "pet-1",
        { pet_name: "Admin Edited" },
        undefined,
        { email: "admin@example.com", name: "Admin", role: "admin" }
      );
      expect(updated.pet_name).toBe("Admin Edited");
    });

    it("throws NotFoundError when pet does not exist", async () => {
      await expect(
        service.updatePet(
          "non-existent",
          { pet_name: "Ghost" },
          undefined,
          { email: "alice@example.com", name: "Alice", role: "user" }
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deletePet", () => {
    it("deletes pet listing when owner requests", async () => {
      const deleted = await service.deletePet("pet-1", {
        email: "alice@example.com",
        name: "Alice",
        role: "user",
      });

      expect(deleted.id).toBe("pet-1");
      expect(mockRepo.pets).toHaveLength(2);
    });

    it("allows admin to delete any pet listing", async () => {
      const deleted = await service.deletePet("pet-1", {
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
      });

      expect(deleted.id).toBe("pet-1");
      expect(mockRepo.pets).toHaveLength(2);
    });

    it("throws ForbiddenError when user is not the owner or admin", async () => {
      await expect(
        service.deletePet("pet-1", {
          email: "stranger@example.com",
          name: "Stranger",
          role: "user",
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("throws NotFoundError when pet does not exist", async () => {
      await expect(
        service.deletePet("non-existent", {
          email: "alice@example.com",
          name: "Alice",
          role: "user",
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("getPetsByOwner", () => {
    it("returns all pets created by specific owner email", async () => {
      const pets = await service.getPetsByOwner("alice@example.com");
      expect(pets).toHaveLength(2);
      expect(pets.map((p) => p.pet_name)).toEqual(["Bella", "Charlie"]);
    });

    it("returns empty array when owner has no listed pets", async () => {
      const pets = await service.getPetsByOwner("nobody@example.com");
      expect(pets).toHaveLength(0);
    });
  });
});
