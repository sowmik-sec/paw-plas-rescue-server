import { describe, it, expect, beforeEach } from "vitest";
import { AdoptionsService } from "../../src/features/adoptions/adoptions.service";
import {
  IAdoptionsRepository,
  AdoptionRequestEnriched,
} from "../../src/features/adoptions/adoptions.repository";
import { IPetsRepository, PetWithDetails, AvailablePetsResult } from "../../src/features/pets/pets.repository";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../src/core/errors/app-error";
import { AdoptionRequest, Pet, Prisma } from "@prisma/client";

class MockAdoptionsRepository implements IAdoptionsRepository {
  public requests: AdoptionRequest[] = [];
  public pets: Pet[] = [];

  async create(data: Prisma.AdoptionRequestCreateInput): Promise<AdoptionRequest> {
    const newReq: AdoptionRequest = {
      id: `req-${this.requests.length + 1}`,
      pet_id: data.pet_id,
      status: data.status || "pending",
      request_date: data.request_date,
      requester_info: data.requester_info as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.requests.push(newReq);
    return newReq;
  }

  async findById(id: string): Promise<AdoptionRequest | null> {
    return this.requests.find((r) => r.id === id) || null;
  }

  async findByPetId(petId: string): Promise<AdoptionRequest[]> {
    return this.requests.filter((r) => r.pet_id === petId);
  }

  async findActiveByPetId(petId: string): Promise<AdoptionRequest | null> {
    return (
      this.requests.find(
        (r) => r.pet_id === petId && ["pending", "adopted"].includes(r.status)
      ) || null
    );
  }

  async findAll(filter?: {
    status?: string;
    petIds?: string[];
    adopterEmail?: string;
  }): Promise<AdoptionRequest[]> {
    let result = [...this.requests];
    if (filter?.status) {
      result = result.filter((r) => r.status === filter.status);
    }
    if (filter?.petIds) {
      result = result.filter((r) => filter.petIds!.includes(r.pet_id));
    }
    if (filter?.adopterEmail) {
      result = result.filter((r) => r.requester_info.email === filter.adopterEmail);
    }
    return result;
  }

  async findAllWithPetDetails(filter?: {
    status?: string;
    ownerEmail?: string;
    adopterEmail?: string;
    petId?: string;
  }): Promise<AdoptionRequestEnriched[]> {
    let filteredRequests = [...this.requests];

    if (filter?.status) {
      filteredRequests = filteredRequests.filter((r) => r.status === filter.status);
    }
    if (filter?.petId) {
      filteredRequests = filteredRequests.filter((r) => r.pet_id === filter.petId);
    }
    if (filter?.adopterEmail) {
      filteredRequests = filteredRequests.filter(
        (r) => r.requester_info.email === filter.adopterEmail
      );
    }

    const enriched: AdoptionRequestEnriched[] = [];
    for (const req of filteredRequests) {
      const pet = this.pets.find((p) => p.id === req.pet_id);
      if (filter?.ownerEmail && pet?.owner_info.email !== filter.ownerEmail) {
        continue;
      }
      enriched.push({
        ...req,
        pet_name: pet?.pet_name,
        pet_category: pet?.pet_category,
        pet_age: pet?.pet_age,
        pet_location: pet?.pet_location,
        pet_image: pet?.pet_image,
        pet_description: pet?.pet_description,
        owner_info: pet?.owner_info,
      });
    }

    return enriched;
  }

  async updateStatus(id: string, status: string): Promise<AdoptionRequest> {
    const index = this.requests.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new Error("Adoption request not found");
    }
    this.requests[index] = {
      ...this.requests[index],
      status,
      updatedAt: new Date(),
    };
    return this.requests[index];
  }

  async updateStatusByPetId(
    petId: string,
    status: string
  ): Promise<AdoptionRequest | null> {
    const index = this.requests.findIndex((r) => r.pet_id === petId);
    if (index === -1) {
      return null;
    }
    this.requests[index] = {
      ...this.requests[index],
      status,
      updatedAt: new Date(),
    };
    return this.requests[index];
  }
}

class MockPetsRepository implements IPetsRepository {
  public pets: Pet[] = [];

  async findAvailablePets(options: {
    category?: string;
    page: number;
    limit: number;
  }): Promise<AvailablePetsResult> {
    return { pets: this.pets, totalPages: 1, currentPage: 1, totalPets: this.pets.length };
  }

  async findById(id: string): Promise<Pet | null> {
    return this.pets.find((p) => p.id === id) || null;
  }

  async findByIdWithDetails(id: string): Promise<PetWithDetails | null> {
    const pet = this.pets.find((p) => p.id === id);
    if (!pet) return null;
    return { ...pet, requestDetails: null };
  }

  async create(data: Prisma.PetCreateInput): Promise<Pet> {
    throw new Error("Not implemented");
  }

  async update(id: string, data: Prisma.PetUpdateInput): Promise<Pet> {
    throw new Error("Not implemented");
  }

  async delete(id: string): Promise<Pet> {
    throw new Error("Not implemented");
  }

  async findByOwnerEmail(email: string): Promise<PetWithDetails[]> {
    return this.pets
      .filter((p) => p.owner_info.email === email)
      .map((p) => ({ ...p, requestDetails: null }));
  }
}

describe("AdoptionsService", () => {
  let adoptionsRepo: MockAdoptionsRepository;
  let petsRepo: MockPetsRepository;
  let service: AdoptionsService;

  const samplePet: Pet = {
    id: "pet-101",
    pet_name: "Buddy",
    pet_category: "dog",
    pet_age: "3",
    pet_location: "Austin, TX",
    pet_description: "Friendly and playful dog",
    pet_image: "https://example.com/buddy.jpg",
    posted_date: "2026-09-10",
    owner_info: { name: "Sarah Owner", email: "owner@example.com" },
    createdAt: new Date("2026-09-10"),
    updatedAt: new Date("2026-09-10"),
  };

  const sampleAdopter = {
    email: "adopter@example.com",
    name: "John Adopter",
    role: "user",
  };

  beforeEach(() => {
    adoptionsRepo = new MockAdoptionsRepository();
    petsRepo = new MockPetsRepository();
    petsRepo.pets = [samplePet];
    adoptionsRepo.pets = [samplePet];
    service = new AdoptionsService(adoptionsRepo, petsRepo);
  });

  describe("createAdoptionRequest", () => {
    it("successfully creates adoption request with pending status", async () => {
      const result = await service.createAdoptionRequest(
        {
          pet_id: "pet-101",
          requester_info: {
            address: "123 Maple Street",
            phone: "555-0199",
          },
        },
        sampleAdopter
      );

      expect(result.id).toBe("req-1");
      expect(result.pet_id).toBe("pet-101");
      expect(result.status).toBe("pending");
      expect(result.requester_info.name).toBe("John Adopter");
      expect(result.requester_info.email).toBe("adopter@example.com");
      expect(result.requester_info.phone).toBe("555-0199");
      expect(result.requester_info.address).toBe("123 Maple Street");
      expect(adoptionsRepo.requests).toHaveLength(1);
    });

    it("throws NotFoundError when target pet does not exist", async () => {
      await expect(
        service.createAdoptionRequest(
          {
            pet_id: "non-existent-pet",
            requester_info: { address: "123 Maple", phone: "555-0199" },
          },
          sampleAdopter
        )
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError if pet owner attempts to adopt their own pet", async () => {
      await expect(
        service.createAdoptionRequest(
          {
            pet_id: "pet-101",
            requester_info: { address: "123 Maple", phone: "555-0199" },
          },
          { email: "owner@example.com", name: "Sarah Owner", role: "user" }
        )
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when pet is already adopted (double adoption prevention)", async () => {
      adoptionsRepo.requests.push({
        id: "req-existing",
        pet_id: "pet-101",
        status: "adopted",
        request_date: "2026-09-12",
        requester_info: {
          name: "Other Adopter",
          email: "other@example.com",
          address: "789 Pine Rd",
          phone: "555-4321",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.createAdoptionRequest(
          {
            pet_id: "pet-101",
            requester_info: { address: "123 Maple", phone: "555-0199" },
          },
          sampleAdopter
        )
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when pet already has a pending adoption request", async () => {
      adoptionsRepo.requests.push({
        id: "req-pending",
        pet_id: "pet-101",
        status: "pending",
        request_date: "2026-09-15",
        requester_info: {
          name: "First Adopter",
          email: "first@example.com",
          address: "100 Oak St",
          phone: "555-1111",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.createAdoptionRequest(
          {
            pet_id: "pet-101",
            requester_info: { address: "123 Maple", phone: "555-0199" },
          },
          sampleAdopter
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getAdoptionRequests", () => {
    beforeEach(() => {
      adoptionsRepo.requests = [
        {
          id: "req-1",
          pet_id: "pet-101",
          status: "pending",
          request_date: "2026-09-15",
          requester_info: {
            name: "John Adopter",
            email: "adopter@example.com",
            address: "123 Maple",
            phone: "555-0199",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    });

    it("allows administrators to retrieve all adoption requests with pet details", async () => {
      const results = await service.getAdoptionRequests(
        { email: "admin@example.com", name: "Admin", role: "admin" },
        {}
      );

      expect(results).toHaveLength(1);
      expect(results[0].pet_name).toBe("Buddy");
      expect(results[0].status).toBe("pending");
    });

    it("allows pet owners to retrieve adoption requests for their listed pets", async () => {
      const results = await service.getAdoptionRequests(
        { email: "owner@example.com", name: "Sarah Owner", role: "user" },
        {}
      );

      expect(results).toHaveLength(1);
      expect(results[0].pet_name).toBe("Buddy");
    });

    it("returns empty array for pet owners with no requests on their pets", async () => {
      const results = await service.getAdoptionRequests(
        { email: "otherowner@example.com", name: "Other Owner", role: "user" },
        {}
      );

      expect(results).toHaveLength(0);
    });

    it("allows adopters to retrieve their submitted requests", async () => {
      const results = await service.getAdoptionRequests(
        { email: "adopter@example.com", name: "John Adopter", role: "user" },
        { adopter_email: "adopter@example.com" }
      );

      expect(results).toHaveLength(1);
      expect(results[0].requester_info.email).toBe("adopter@example.com");
    });
  });

  describe("approveAdoption", () => {
    beforeEach(() => {
      adoptionsRepo.requests = [
        {
          id: "req-1",
          pet_id: "pet-101",
          status: "pending",
          request_date: "2026-09-15",
          requester_info: {
            name: "John Adopter",
            email: "adopter@example.com",
            address: "123 Maple",
            phone: "555-0199",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    });

    it("allows pet owner to approve adoption request by request ID", async () => {
      const updated = await service.approveAdoption("req-1", {
        email: "owner@example.com",
        name: "Sarah Owner",
        role: "user",
      });

      expect(updated.status).toBe("adopted");
      expect(adoptionsRepo.requests[0].status).toBe("adopted");
    });

    it("allows pet owner to approve adoption request by pet ID (legacy pattern)", async () => {
      const updated = await service.approveAdoption("pet-101", {
        email: "owner@example.com",
        name: "Sarah Owner",
        role: "user",
      });

      expect(updated.status).toBe("adopted");
      expect(adoptionsRepo.requests[0].status).toBe("adopted");
    });

    it("allows administrator to approve any adoption request", async () => {
      const updated = await service.approveAdoption("req-1", {
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
      });

      expect(updated.status).toBe("adopted");
    });

    it("throws ForbiddenError if non-owner regular user attempts to approve", async () => {
      await expect(
        service.approveAdoption("req-1", {
          email: "stranger@example.com",
          name: "Stranger",
          role: "user",
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("throws NotFoundError if adoption request does not exist", async () => {
      await expect(
        service.approveAdoption("req-999", {
          email: "owner@example.com",
          name: "Sarah Owner",
          role: "user",
        })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
