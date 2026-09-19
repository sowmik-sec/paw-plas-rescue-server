import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { AuthService } from "../../src/features/auth/auth.service";
import { PetsService } from "../../src/features/pets/pets.service";
import { PetsController } from "../../src/features/pets/pets.controller";
import {
  createPetsRouter,
  createLegacyPetsRouter,
} from "../../src/features/pets/pets.routes";
import { createAuthenticateMiddleware } from "../../src/features/auth/auth.middleware";
import { MemoryMediaAdapter } from "../../src/core/storage/memory-media.adapter";

describe("Pets Feature HTTP Seam", () => {
  const secret = "test-secret-key-1234567890";
  const authService = new AuthService(secret);
  const authenticateMiddleware = createAuthenticateMiddleware(authService);

  const mockPetsRepo = {
    findAvailablePets: vi.fn(),
    findById: vi.fn(),
    findByIdWithDetails: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findByOwnerEmail: vi.fn(),
  };

  const mediaStorage = new MemoryMediaAdapter();
  const petsService = new PetsService(mockPetsRepo as any, mediaStorage);
  const petsController = new PetsController(petsService);

  const customPetsRouter = createPetsRouter({
    controller: petsController,
    authenticateMiddleware,
  });
  const customLegacyPetsRouter = createLegacyPetsRouter({
    controller: petsController,
    authenticateMiddleware,
  });

  const app = createApp({
    petsRouter: customPetsRouter,
    legacyPetsRouter: customLegacyPetsRouter,
  });

  const validObjectId = "507f1f77bcf86cd799439011";
  const validOwnerEmail = "owner@example.com";
  const generateToken = (email: string, role = "user") =>
    authService.generateToken({ email, role });

  const samplePet = {
    id: validObjectId,
    pet_name: "Barnaby",
    pet_category: "dog",
    pet_age: "2",
    pet_location: "Austin, TX",
    pet_description: "Friendly dog looking for a home",
    pet_image: "https://mock.com/barnaby.jpg",
    posted_date: "2026-09-19",
    owner_info: {
      name: "Owner John",
      email: validOwnerEmail,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mediaStorage.clear();
  });

  describe("GET /api/v1/pets (Public Pet Catalog)", () => {
    it("returns paginated available pets and pagination metadata", async () => {
      mockPetsRepo.findAvailablePets.mockResolvedValue({
        pets: [samplePet],
        totalPages: 1,
        currentPage: 1,
        totalPets: 1,
      });

      const response = await request(app).get("/api/v1/pets?page=1&limit=10");

      expect(response.status).toBe(200);
      expect(response.body.pets).toHaveLength(1);
      expect(response.body.pets[0]._id).toBe(validObjectId);
      expect(response.body.pets[0].pet_name).toBe("Barnaby");
      expect(response.body.totalPages).toBe(1);
      expect(response.body.currentPage).toBe(1);
      expect(response.body.totalPets).toBe(1);
    });

    it("filters available pets by category", async () => {
      mockPetsRepo.findAvailablePets.mockResolvedValue({
        pets: [samplePet],
        totalPages: 1,
        currentPage: 1,
        totalPets: 1,
      });

      const response = await request(app).get("/api/v1/pets?category=dog");

      expect(response.status).toBe(200);
      expect(mockPetsRepo.findAvailablePets).toHaveBeenCalledWith({
        category: "dog",
        page: 1,
        limit: 10,
      });
    });

    it("supports legacy /pets path", async () => {
      mockPetsRepo.findAvailablePets.mockResolvedValue({
        pets: [samplePet],
        totalPages: 1,
        currentPage: 1,
        totalPets: 1,
      });

      const response = await request(app).get("/pets?category=dog");
      expect(response.status).toBe(200);
      expect(response.body.pets).toHaveLength(1);
    });
  });

  describe("GET /api/v1/pets/:id (Pet Details)", () => {
    it("returns full pet details with status for existing pet", async () => {
      mockPetsRepo.findByIdWithDetails.mockResolvedValue({
        ...samplePet,
        requestDetails: null,
      });

      const response = await request(app).get(`/api/v1/pets/${validObjectId}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(validObjectId);
      expect(response.body.pet_name).toBe("Barnaby");
      expect(response.body.requestDetails).toBeNull();
    });

    it("supports legacy /pets/details/:id path", async () => {
      mockPetsRepo.findByIdWithDetails.mockResolvedValue({
        ...samplePet,
        requestDetails: null,
      });

      const response = await request(app).get(
        `/pets/details/${validObjectId}`
      );

      expect(response.status).toBe(200);
      expect(response.body.pet_name).toBe("Barnaby");
    });

    it("returns 404 when pet does not exist", async () => {
      mockPetsRepo.findByIdWithDetails.mockResolvedValue(null);

      const response = await request(app).get(`/api/v1/pets/${validObjectId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Pet not found");
    });

    it("returns 400 when pet ID format is malformed", async () => {
      const response = await request(app).get("/api/v1/pets/not-a-valid-id");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/pets (Create Pet Listing)", () => {
    it("creates a new pet listing with multipart file upload and bearer token", async () => {
      mockPetsRepo.create.mockResolvedValue(samplePet);

      const token = generateToken(validOwnerEmail);
      const response = await request(app)
        .post("/api/v1/pets")
        .set("Authorization", `Bearer ${token}`)
        .field("pet_name", "Barnaby")
        .field("pet_category", "dog")
        .field("pet_age", "2")
        .field("pet_location", "Austin, TX")
        .field("pet_description", "Friendly dog looking for a home")
        .field(
          "owner_info",
          JSON.stringify({ name: "Owner John", email: validOwnerEmail })
        )
        .attach("pet_image", Buffer.from("fake-image"), "barnaby.jpg");

      expect(response.status).toBe(201);
      expect(response.body.acknowledged).toBe(true);
      expect(response.body.insertedId).toBe(validObjectId);
      expect(response.body.pet._id).toBe(validObjectId);
    });

    it("supports legacy /add-pet path", async () => {
      mockPetsRepo.create.mockResolvedValue(samplePet);

      const token = generateToken(validOwnerEmail);
      const response = await request(app)
        .post("/add-pet")
        .set("Authorization", `Bearer ${token}`)
        .field("pet_name", "Barnaby")
        .field("pet_category", "dog")
        .field("pet_age", "2")
        .field("pet_location", "Austin, TX")
        .field("pet_description", "Friendly dog looking for a home")
        .attach("pet_image", Buffer.from("fake-image"), "barnaby.jpg");

      expect(response.status).toBe(201);
      expect(response.body.insertedId).toBe(validObjectId);
    });

    it("returns 401 when authorization token is missing", async () => {
      const response = await request(app)
        .post("/api/v1/pets")
        .field("pet_name", "Barnaby")
        .attach("pet_image", Buffer.from("fake-image"), "barnaby.jpg");

      expect(response.status).toBe(401);
    });

    it("returns 400 when pet image is missing", async () => {
      const token = generateToken(validOwnerEmail);
      const response = await request(app)
        .post("/api/v1/pets")
        .set("Authorization", `Bearer ${token}`)
        .field("pet_name", "Barnaby")
        .field("pet_category", "dog")
        .field("pet_age", "2")
        .field("pet_location", "Austin, TX")
        .field("pet_description", "Friendly dog looking for a home");

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Pet image is required");
    });
  });

  describe("PUT /api/v1/pets/:id (Update Pet Listing)", () => {
    it("updates pet listing when requester is the owner", async () => {
      mockPetsRepo.findById.mockResolvedValue(samplePet);
      mockPetsRepo.update.mockResolvedValue({
        ...samplePet,
        pet_name: "Barnaby Senior",
      });

      const token = generateToken(validOwnerEmail);
      const response = await request(app)
        .put(`/api/v1/pets/${validObjectId}`)
        .set("Authorization", `Bearer ${token}`)
        .field("pet_name", "Barnaby Senior");

      expect(response.status).toBe(200);
      expect(response.body.modifiedCount).toBe(1);
      expect(response.body.pet.pet_name).toBe("Barnaby Senior");
    });

    it("supports legacy /update-pet/:id path", async () => {
      mockPetsRepo.findById.mockResolvedValue(samplePet);
      mockPetsRepo.update.mockResolvedValue({
        ...samplePet,
        pet_name: "Barnaby Senior",
      });

      const token = generateToken(validOwnerEmail);
      const response = await request(app)
        .put(`/update-pet/${validObjectId}`)
        .set("Authorization", `Bearer ${token}`)
        .field("pet_name", "Barnaby Senior");

      expect(response.status).toBe(200);
      expect(response.body.modifiedCount).toBe(1);
    });

    it("returns 403 when user is not the pet owner", async () => {
      mockPetsRepo.findById.mockResolvedValue(samplePet);

      const token = generateToken("stranger@example.com");
      const response = await request(app)
        .put(`/api/v1/pets/${validObjectId}`)
        .set("Authorization", `Bearer ${token}`)
        .field("pet_name", "Hacked Name");

      expect(response.status).toBe(403);
    });

    it("returns 404 when pet does not exist", async () => {
      mockPetsRepo.findById.mockResolvedValue(null);

      const token = generateToken(validOwnerEmail);
      const response = await request(app)
        .put(`/api/v1/pets/${validObjectId}`)
        .set("Authorization", `Bearer ${token}`)
        .field("pet_name", "New Name");

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/pets/:id (Delete Pet Listing)", () => {
    it("deletes pet listing when requester is the owner", async () => {
      mockPetsRepo.findById.mockResolvedValue(samplePet);
      mockPetsRepo.delete.mockResolvedValue(samplePet);

      const token = generateToken(validOwnerEmail);
      const response = await request(app)
        .delete(`/api/v1/pets/${validObjectId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.deletedCount).toBe(1);
    });

    it("supports legacy /delete-pet/:id path", async () => {
      mockPetsRepo.findById.mockResolvedValue(samplePet);
      mockPetsRepo.delete.mockResolvedValue(samplePet);

      const token = generateToken(validOwnerEmail);
      const response = await request(app)
        .delete(`/delete-pet/${validObjectId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.deletedCount).toBe(1);
    });

    it("returns 403 when user is not the owner or admin", async () => {
      mockPetsRepo.findById.mockResolvedValue(samplePet);

      const token = generateToken("stranger@example.com");
      const response = await request(app)
        .delete(`/api/v1/pets/${validObjectId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("returns 404 when pet does not exist", async () => {
      mockPetsRepo.findById.mockResolvedValue(null);

      const token = generateToken(validOwnerEmail);
      const response = await request(app)
        .delete(`/api/v1/pets/${validObjectId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/v1/pets/owner/me (Owner Listed Pets)", () => {
    it("returns all pets belonging to authenticated owner", async () => {
      mockPetsRepo.findByOwnerEmail.mockResolvedValue([
        { ...samplePet, requestDetails: null },
      ]);

      const token = generateToken(validOwnerEmail);
      const response = await request(app)
        .get("/api/v1/pets/owner/me")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]._id).toBe(validObjectId);
      expect(response.body[0].owner_info.email).toBe(validOwnerEmail);
    });

    it("supports legacy /my-pets path", async () => {
      mockPetsRepo.findByOwnerEmail.mockResolvedValue([
        { ...samplePet, requestDetails: null },
      ]);

      const token = generateToken(validOwnerEmail);
      const response = await request(app)
        .get("/my-pets")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]._id).toBe(validObjectId);
    });

    it("returns 401 when token is missing", async () => {
      const response = await request(app).get("/api/v1/pets/owner/me");
      expect(response.status).toBe(401);
    });
  });
});
