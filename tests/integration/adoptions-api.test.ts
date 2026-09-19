import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { AuthService } from "../../src/features/auth/auth.service";
import { AdoptionsService } from "../../src/features/adoptions/adoptions.service";
import { AdoptionsController } from "../../src/features/adoptions/adoptions.controller";
import {
  createAdoptionsRouter,
  createLegacyAdoptionsRouter,
} from "../../src/features/adoptions/adoptions.routes";
import { createAuthenticateMiddleware } from "../../src/features/auth/auth.middleware";

describe("Adoptions Feature HTTP Seam", () => {
  const secret = "test-secret-key-1234567890";
  const authService = new AuthService(secret);
  const authenticateMiddleware = createAuthenticateMiddleware(authService);

  const mockAdoptionsRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findByPetId: vi.fn(),
    findActiveByPetId: vi.fn(),
    findAll: vi.fn(),
    findAllWithPetDetails: vi.fn(),
    updateStatus: vi.fn(),
    updateStatusByPetId: vi.fn(),
  };

  const mockPetsRepo = {
    findAvailablePets: vi.fn(),
    findById: vi.fn(),
    findByIdWithDetails: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findByOwnerEmail: vi.fn(),
  };

  const adoptionsService = new AdoptionsService(
    mockAdoptionsRepo as any,
    mockPetsRepo as any
  );
  const adoptionsController = new AdoptionsController(adoptionsService);

  const customAdoptionsRouter = createAdoptionsRouter({
    controller: adoptionsController,
    authenticateMiddleware,
  });
  const customLegacyAdoptionsRouter = createLegacyAdoptionsRouter({
    controller: adoptionsController,
    authenticateMiddleware,
  });

  const app = createApp({
    adoptionsRouter: customAdoptionsRouter,
    legacyAdoptionsRouter: customLegacyAdoptionsRouter,
  });

  const validPetId = "507f1f77bcf86cd799439011";
  const validRequestId = "507f191e810c19729de860ea";
  const ownerEmail = "owner@example.com";
  const adopterEmail = "adopter@example.com";
  const adminEmail = "admin@example.com";

  const generateToken = (email: string, role = "user") =>
    authService.generateToken({ email, role });

  const samplePet = {
    id: validPetId,
    pet_name: "Luna",
    pet_category: "cat",
    pet_age: "2",
    pet_location: "Seattle, WA",
    pet_description: "Loving cat",
    pet_image: "https://example.com/luna.jpg",
    posted_date: "2026-09-10",
    owner_info: { name: "Alice Owner", email: ownerEmail },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleRequest = {
    id: validRequestId,
    pet_id: validPetId,
    status: "pending",
    request_date: "2026-09-15",
    requester_info: {
      name: "John Adopter",
      email: adopterEmail,
      address: "123 Elm St",
      phone: "555-9876",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/adoptions & POST /pet-request (Submit Adoption Request)", () => {
    it("creates a new adoption request with authenticated bearer token", async () => {
      mockPetsRepo.findById.mockResolvedValue(samplePet);
      mockAdoptionsRepo.findActiveByPetId.mockResolvedValue(null);
      mockAdoptionsRepo.create.mockResolvedValue(sampleRequest);

      const token = generateToken(adopterEmail);
      const response = await request(app)
        .post("/api/v1/adoptions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          pet_id: validPetId,
          requester_info: {
            address: "123 Elm St",
            phone: "555-9876",
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.acknowledged).toBe(true);
      expect(response.body.insertedId).toBe(validRequestId);
      expect(response.body.adoptionRequest._id).toBe(validRequestId);
      expect(response.body.adoptionRequest.status).toBe("pending");
    });

    it("supports legacy POST /pet-request contract", async () => {
      mockPetsRepo.findById.mockResolvedValue(samplePet);
      mockAdoptionsRepo.findActiveByPetId.mockResolvedValue(null);
      mockAdoptionsRepo.create.mockResolvedValue(sampleRequest);

      const token = generateToken(adopterEmail);
      const response = await request(app)
        .post("/pet-request")
        .set("Authorization", `Bearer ${token}`)
        .send({
          pet_id: validPetId,
          requester_info: {
            address: "123 Elm St",
            phone: "555-9876",
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.acknowledged).toBe(true);
      expect(response.body.insertedId).toBe(validRequestId);
    });

    it("returns 401 when token is missing", async () => {
      const response = await request(app).post("/api/v1/adoptions").send({
        pet_id: validPetId,
      });

      expect(response.status).toBe(401);
    });

    it("returns 404 when target pet is not found", async () => {
      mockPetsRepo.findById.mockResolvedValue(null);

      const token = generateToken(adopterEmail);
      const response = await request(app)
        .post("/api/v1/adoptions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          pet_id: validPetId,
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain("Pet not found");
    });

    it("returns 400 when pet owner tries to adopt own pet", async () => {
      mockPetsRepo.findById.mockResolvedValue(samplePet);

      const token = generateToken(ownerEmail);
      const response = await request(app)
        .post("/api/v1/adoptions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          pet_id: validPetId,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("own pet");
    });

    it("returns 400 when pet is already adopted (double adoption prevention)", async () => {
      mockPetsRepo.findById.mockResolvedValue(samplePet);
      mockAdoptionsRepo.findActiveByPetId.mockResolvedValue({
        ...sampleRequest,
        status: "adopted",
      });

      const token = generateToken(adopterEmail);
      const response = await request(app)
        .post("/api/v1/adoptions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          pet_id: validPetId,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("already been adopted");
    });
  });

  describe("GET /api/v1/adoptions & GET /adoption-requests (Retrieve Requests)", () => {
    it("returns adoption requests with pet details and compatibility mapping", async () => {
      mockAdoptionsRepo.findAllWithPetDetails.mockResolvedValue([
        {
          ...sampleRequest,
          pet_name: "Luna",
          pet_category: "cat",
          pet_image: "https://example.com/luna.jpg",
          pet_location: "Seattle, WA",
          owner_info: { name: "Alice Owner", email: ownerEmail },
        },
      ]);

      const token = generateToken(ownerEmail);
      const response = await request(app)
        .get("/api/v1/adoptions")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]._id).toBe(validPetId);
      expect(response.body[0].pet_name).toBe("Luna");
      expect(response.body[0].petRequests[0].status).toBe("pending");
    });

    it("supports legacy GET /adoption-requests path", async () => {
      mockAdoptionsRepo.findAllWithPetDetails.mockResolvedValue([
        {
          ...sampleRequest,
          pet_name: "Luna",
          pet_category: "cat",
          pet_image: "https://example.com/luna.jpg",
          pet_location: "Seattle, WA",
          owner_info: { name: "Alice Owner", email: ownerEmail },
        },
      ]);

      const token = generateToken(adminEmail, "admin");
      const response = await request(app)
        .get("/adoption-requests")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].pet_name).toBe("Luna");
    });

    it("returns 401 when token is missing", async () => {
      const response = await request(app).get("/api/v1/adoptions");
      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /api/v1/adoptions/:id/approve & PATCH /make-adopted/:id", () => {
    it("approves adoption request when pet owner makes request", async () => {
      mockAdoptionsRepo.findById.mockResolvedValue(sampleRequest);
      mockPetsRepo.findById.mockResolvedValue(samplePet);
      mockAdoptionsRepo.updateStatus.mockResolvedValue({
        ...sampleRequest,
        status: "adopted",
      });

      const token = generateToken(ownerEmail);
      const response = await request(app)
        .patch(`/api/v1/adoptions/${validRequestId}/approve`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.acknowledged).toBe(true);
      expect(response.body.modifiedCount).toBe(1);
      expect(response.body.adoptionRequest.status).toBe("adopted");
    });

    it("supports legacy PATCH /make-adopted/:id with pet ID", async () => {
      mockAdoptionsRepo.findById.mockResolvedValue(null);
      mockAdoptionsRepo.findActiveByPetId.mockResolvedValue(sampleRequest);
      mockPetsRepo.findById.mockResolvedValue(samplePet);
      mockAdoptionsRepo.updateStatus.mockResolvedValue({
        ...sampleRequest,
        status: "adopted",
      });

      const token = generateToken(ownerEmail);
      const response = await request(app)
        .patch(`/make-adopted/${validPetId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.acknowledged).toBe(true);
      expect(response.body.modifiedCount).toBe(1);
    });

    it("allows admin to approve any adoption request", async () => {
      mockAdoptionsRepo.findById.mockResolvedValue(sampleRequest);
      mockPetsRepo.findById.mockResolvedValue(samplePet);
      mockAdoptionsRepo.updateStatus.mockResolvedValue({
        ...sampleRequest,
        status: "adopted",
      });

      const token = generateToken(adminEmail, "admin");
      const response = await request(app)
        .patch(`/api/v1/adoptions/${validRequestId}/approve`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.acknowledged).toBe(true);
    });

    it("returns 403 when non-owner user tries to approve", async () => {
      mockAdoptionsRepo.findById.mockResolvedValue(sampleRequest);
      mockPetsRepo.findById.mockResolvedValue(samplePet);

      const token = generateToken("stranger@example.com");
      const response = await request(app)
        .patch(`/api/v1/adoptions/${validRequestId}/approve`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("returns 404 when adoption request does not exist", async () => {
      mockAdoptionsRepo.findById.mockResolvedValue(null);
      mockAdoptionsRepo.findActiveByPetId.mockResolvedValue(null);

      const token = generateToken(ownerEmail);
      const response = await request(app)
        .patch(`/api/v1/adoptions/${validRequestId}/approve`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});
