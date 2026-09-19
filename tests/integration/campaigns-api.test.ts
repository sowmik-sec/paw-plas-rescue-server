import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { AuthService } from "../../src/features/auth/auth.service";
import { CampaignsService } from "../../src/features/campaigns/campaigns.service";
import { CampaignsController } from "../../src/features/campaigns/campaigns.controller";
import {
  createCampaignsRouter,
  createLegacyCampaignsRouter,
} from "../../src/features/campaigns/campaigns.routes";
import {
  createAuthenticateMiddleware,
  createRequireAdminMiddleware,
} from "../../src/features/auth/auth.middleware";
import { MemoryMediaAdapter } from "../../src/core/storage/memory-media.adapter";

describe("Campaigns Feature HTTP Seam", () => {
  const secret = "test-secret-key-1234567890";
  const authService = new AuthService(secret);
  const authenticateMiddleware = createAuthenticateMiddleware(authService);
  const mockUsersRepo = {
    findByEmail: vi.fn(),
  };

  const requireAdminMiddleware = createRequireAdminMiddleware(
    mockUsersRepo as any
  );

  const mockCampaignsRepo = {
    findPaginated: vi.fn(),
    findById: vi.fn(),
    findByIdWithDonations: vi.fn(),
    findByCreatorEmail: vi.fn(),
    findAllWithAggregates: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mediaStorage = new MemoryMediaAdapter();
  const campaignsService = new CampaignsService(
    mockCampaignsRepo as any,
    mediaStorage
  );
  const campaignsController = new CampaignsController(campaignsService);

  const customCampaignsRouter = createCampaignsRouter({
    controller: campaignsController,
    authenticateMiddleware,
    requireAdminMiddleware,
  });
  const customLegacyCampaignsRouter = createLegacyCampaignsRouter({
    controller: campaignsController,
    authenticateMiddleware,
    requireAdminMiddleware,
  });

  const app = createApp({
    campaignsRouter: customCampaignsRouter,
    legacyCampaignsRouter: customLegacyCampaignsRouter,
  });

  const validObjectId = "507f1f77bcf86cd799439011";
  const validCreatorEmail = "creator@example.com";
  const generateToken = (email: string, role = "user") =>
    authService.generateToken({ email, role });

  const sampleCampaign = {
    id: validObjectId,
    pet_name: "Luna",
    max_donation: 500,
    last_date: "2026-10-15",
    short_description: "Help Luna get medical care",
    long_description: "Full description of Luna's treatment.",
    pet_image: "https://mock.com/luna.jpg",
    donation_created_at: "2026-09-01",
    creator_info: {
      name: "Jane Creator",
      email: validCreatorEmail,
    },
    totalAmount: 250,
    remainingDays: 26,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mediaStorage.clear();
  });

  describe("GET /api/v1/campaigns (Public Paginated Campaigns)", () => {
    it("returns paginated campaigns with totalAmount and remainingDays", async () => {
      mockCampaignsRepo.findPaginated.mockResolvedValue({
        campaigns: [sampleCampaign],
        totalPages: 1,
        currentPage: 1,
        totalCampaigns: 1,
      });

      const response = await request(app).get("/api/v1/campaigns?page=1&limit=10");

      expect(response.status).toBe(200);
      expect(response.body.campaigns).toHaveLength(1);
      expect(response.body.campaigns[0]._id).toBe(validObjectId);
      expect(response.body.campaigns[0].pet_name).toBe("Luna");
      expect(response.body.campaigns[0].totalAmount).toBe(250);
      expect(response.body.campaigns[0].remainingDays).toBe(26);
      expect(response.body.totalPages).toBe(1);
      expect(response.body.currentPage).toBe(1);
      expect(response.body.totalCampaigns).toBe(1);
    });

    it("supports legacy /donation-campaigns endpoint alias", async () => {
      mockCampaignsRepo.findPaginated.mockResolvedValue({
        campaigns: [sampleCampaign],
        totalPages: 1,
        currentPage: 1,
        totalCampaigns: 1,
      });

      const response = await request(app).get("/donation-campaigns");

      expect(response.status).toBe(200);
      expect(response.body.campaigns).toHaveLength(1);
      expect(response.body.campaigns[0]._id).toBe(validObjectId);
    });
  });

  describe("GET /api/v1/campaigns/:id (Campaign Details)", () => {
    it("returns campaign details including donor contributions and creator info", async () => {
      mockCampaignsRepo.findByIdWithDonations.mockResolvedValue({
        ...sampleCampaign,
        donations: [
          {
            _id: "donor@example.com",
            email: "donor@example.com",
            totalDonation: 250,
            donations: [
              {
                id: "don-1",
                donation: 250,
                email: "donor@example.com",
                date: "2026-09-10",
                transactionId: "txn_123",
              },
            ],
          },
        ],
      });

      const response = await request(app).get(
        `/api/v1/campaigns/${validObjectId}`
      );

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(validObjectId);
      expect(response.body.pet_name).toBe("Luna");
      expect(response.body.creator_info.email).toBe(validCreatorEmail);
      expect(response.body.donations).toHaveLength(1);
      expect(response.body.donations[0].totalDonation).toBe(250);
    });

    it("supports legacy /donation-campaign/:id endpoint alias", async () => {
      mockCampaignsRepo.findByIdWithDonations.mockResolvedValue({
        ...sampleCampaign,
        donations: [],
      });

      const response = await request(app).get(
        `/donation-campaign/${validObjectId}`
      );

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(validObjectId);
    });

    it("returns 404 when campaign does not exist", async () => {
      mockCampaignsRepo.findByIdWithDonations.mockResolvedValue(null);

      const response = await request(app).get(
        `/api/v1/campaigns/${validObjectId}`
      );

      expect(response.status).toBe(404);
      expect(response.body.message).toContain("not found");
    });

    it("returns 400 when campaign id is malformed", async () => {
      const response = await request(app).get("/api/v1/campaigns/invalid-id-123");

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/v1/campaigns (Create Campaign)", () => {
    it("creates a new campaign with multipart upload and authentication", async () => {
      const token = generateToken(validCreatorEmail, "user");

      mockCampaignsRepo.create.mockResolvedValue({
        id: validObjectId,
        pet_name: "Rocky",
        max_donation: 1000,
        last_date: "2026-11-20",
        short_description: "Help Rocky recover",
        long_description: "Long details about Rocky",
        pet_image: "https://memory-storage.local/campaigns/rocky.jpg",
        donation_created_at: "2026-09-19",
        creator_info: {
          name: "Jane Creator",
          email: validCreatorEmail,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post("/api/v1/campaigns")
        .set("Authorization", `Bearer ${token}`)
        .field("pet_name", "Rocky")
        .field("max_donation", "1000")
        .field("last_date", "2026-11-20")
        .field("short_description", "Help Rocky recover")
        .field("long_description", "Long details about Rocky")
        .attach("pet_image", Buffer.from("fake-image-bytes"), "rocky.jpg");

      expect(response.status).toBe(201);
      expect(response.body.acknowledged).toBe(true);
      expect(response.body.insertedId).toBe(validObjectId);
      expect(response.body.campaign._id).toBe(validObjectId);
      expect(response.body.campaign.pet_name).toBe("Rocky");
    });

    it("supports legacy /create-donation-campaign path", async () => {
      const token = generateToken(validCreatorEmail, "user");

      mockCampaignsRepo.create.mockResolvedValue({
        id: validObjectId,
        pet_name: "Rocky",
        max_donation: 1000,
        last_date: "2026-11-20",
        short_description: "Help Rocky recover",
        long_description: "Long details about Rocky",
        pet_image: "https://memory-storage.local/campaigns/rocky.jpg",
        donation_created_at: "2026-09-19",
        creator_info: {
          name: "Jane Creator",
          email: validCreatorEmail,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post("/create-donation-campaign")
        .set("Authorization", `Bearer ${token}`)
        .field("pet_name", "Rocky")
        .field("max_donation", "1000")
        .field("last_date", "2026-11-20")
        .field("short_description", "Help Rocky recover")
        .attach("pet_image", Buffer.from("fake-image-bytes"), "rocky.jpg");

      expect(response.status).toBe(201);
      expect(response.body.insertedId).toBe(validObjectId);
    });

    it("returns 401 when authorization token is missing", async () => {
      const response = await request(app)
        .post("/api/v1/campaigns")
        .field("pet_name", "Rocky")
        .field("max_donation", "1000")
        .field("last_date", "2026-11-20")
        .field("short_description", "Help Rocky")
        .attach("pet_image", Buffer.from("fake"), "rocky.jpg");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/v1/campaigns/creator/me (Creator Dashboard Campaigns)", () => {
    it("returns campaigns initiated by the authenticated user", async () => {
      const token = generateToken(validCreatorEmail, "user");
      mockCampaignsRepo.findByCreatorEmail.mockResolvedValue([sampleCampaign]);

      const response = await request(app)
        .get("/api/v1/campaigns/creator/me")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]._id).toBe(validObjectId);
      expect(response.body[0].creator_info.email).toBe(validCreatorEmail);
    });

    it("supports legacy /my-donation-campaigns path", async () => {
      const token = generateToken(validCreatorEmail, "user");
      mockCampaignsRepo.findByCreatorEmail.mockResolvedValue([sampleCampaign]);

      const response = await request(app)
        .get(`/my-donation-campaigns?email=${validCreatorEmail}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]._id).toBe(validObjectId);
    });

    it("returns 401 when authorization token is missing", async () => {
      const response = await request(app).get("/api/v1/campaigns/creator/me");
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/v1/campaigns/admin/all (Admin All Campaigns)", () => {
    it("returns all platform-wide campaigns when requester is admin", async () => {
      const adminToken = generateToken("admin@example.com", "admin");
      mockUsersRepo.findByEmail.mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        role: "admin",
      });
      mockCampaignsRepo.findAllWithAggregates.mockResolvedValue([
        sampleCampaign,
      ]);

      const response = await request(app)
        .get("/api/v1/campaigns/admin/all")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]._id).toBe(validObjectId);
      expect(response.body[0].totalAmount).toBe(250);
    });

    it("supports legacy /all-donation-campaigns path for admin", async () => {
      const adminToken = generateToken("admin@example.com", "admin");
      mockUsersRepo.findByEmail.mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        role: "admin",
      });
      mockCampaignsRepo.findAllWithAggregates.mockResolvedValue([
        sampleCampaign,
      ]);

      const response = await request(app)
        .get("/all-donation-campaigns")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it("returns 403 when requester is not an administrator", async () => {
      const userToken = generateToken("regular@example.com", "user");
      mockUsersRepo.findByEmail.mockResolvedValue({
        id: "user-1",
        email: "regular@example.com",
        role: "user",
      });

      const response = await request(app)
        .get("/api/v1/campaigns/admin/all")
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it("returns 401 when token is missing", async () => {
      const response = await request(app).get("/api/v1/campaigns/admin/all");
      expect(response.status).toBe(401);
    });
  });
});
