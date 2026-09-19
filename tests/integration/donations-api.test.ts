import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { AuthService } from "../../src/features/auth/auth.service";
import { DonationsService } from "../../src/features/donations/donations.service";
import { DonationsController } from "../../src/features/donations/donations.controller";
import {
  createDonationsRouter,
  createLegacyDonationsRouter,
} from "../../src/features/donations/donations.routes";
import {
  createAuthenticateMiddleware,
  createRequireAdminMiddleware,
} from "../../src/features/auth/auth.middleware";
import { FakePaymentAdapter } from "../../src/core/payment/fake-payment.adapter";

describe("Donations Feature HTTP Seam", () => {
  const secret = "test-secret-key-1234567890";
  const authService = new AuthService(secret);
  const authenticateMiddleware = createAuthenticateMiddleware(authService);
  const mockUsersRepo = {
    findByEmail: vi.fn(),
  };
  const requireAdminMiddleware = createRequireAdminMiddleware(
    mockUsersRepo as any
  );

  const mockDonationsRepo = {
    create: vi.fn(),
    findByCampaignId: vi.fn(),
    findByDonorEmail: vi.fn(),
    findGroupedByCampaignForDonor: vi.fn(),
    getTotalDonationsByCampaignId: vi.fn(),
    findAllAdminGrouped: vi.fn(),
    findAll: vi.fn(),
  };

  const mockCampaignsRepo = {
    findById: vi.fn(),
  };

  const fakePaymentGateway = new FakePaymentAdapter();
  const donationsService = new DonationsService(
    mockDonationsRepo as any,
    mockCampaignsRepo as any,
    fakePaymentGateway
  );
  const donationsController = new DonationsController(donationsService);

  const customDonationsRouter = createDonationsRouter({
    controller: donationsController,
    authenticateMiddleware,
    requireAdminMiddleware,
  });
  const customLegacyDonationsRouter = createLegacyDonationsRouter({
    controller: donationsController,
    authenticateMiddleware,
    requireAdminMiddleware,
  });

  const app = createApp({
    donationsRouter: customDonationsRouter,
    legacyDonationsRouter: customLegacyDonationsRouter,
  });

  const validObjectId = "507f1f77bcf86cd799439011";
  const validDonorEmail = "donor@example.com";
  const generateToken = (email: string, role = "user") =>
    authService.generateToken({ email, role });

  const sampleCampaign = {
    id: validObjectId,
    pet_name: "Buddy",
    max_donation: 500,
    last_date: "2026-12-31",
    short_description: "Help Buddy",
    creator_info: {
      name: "Alice Campaigner",
      email: "alice@example.com",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fakePaymentGateway.clear();
  });

  describe("POST /api/v1/donations/payment-intent (Payment Intent Generation)", () => {
    it("generates a client secret for valid donation amounts", async () => {
      const token = generateToken(validDonorEmail, "user");

      const response = await request(app)
        .post("/api/v1/donations/payment-intent")
        .set("Authorization", `Bearer ${token}`)
        .send({ donation: 50 });

      expect(response.status).toBe(200);
      expect(response.body.clientSecret).toBeDefined();
      expect(fakePaymentGateway.intents).toHaveLength(1);
      expect(fakePaymentGateway.intents[0].amountInCents).toBe(5000);
    });

    it("supports legacy /create-donation-intent endpoint alias", async () => {
      const token = generateToken(validDonorEmail, "user");

      const response = await request(app)
        .post("/create-donation-intent")
        .set("Authorization", `Bearer ${token}`)
        .send({ donation: 25 });

      expect(response.status).toBe(200);
      expect(response.body.clientSecret).toBeDefined();
    });

    it("returns 400 when donation amount is non-positive or invalid", async () => {
      const token = generateToken(validDonorEmail, "user");

      const response = await request(app)
        .post("/api/v1/donations/payment-intent")
        .set("Authorization", `Bearer ${token}`)
        .send({ donation: -10 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("greater than 0");
    });

    it("returns 401 when authorization token is missing", async () => {
      const response = await request(app)
        .post("/api/v1/donations/payment-intent")
        .send({ donation: 50 });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/v1/donations (Record Donation)", () => {
    it("records a donation contribution linked to campaign and donor email", async () => {
      const token = generateToken(validDonorEmail, "user");
      mockCampaignsRepo.findById.mockResolvedValue(sampleCampaign);
      mockDonationsRepo.create.mockResolvedValue({
        id: "don-123",
        pet_id: validObjectId,
        donation: 75,
        email: validDonorEmail,
        date: "2026-09-19",
        transactionId: "txn_test_789",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post("/api/v1/donations")
        .set("Authorization", `Bearer ${token}`)
        .send({
          pet_id: validObjectId,
          donation: 75,
          transactionId: "txn_test_789",
        });

      expect(response.status).toBe(201);
      expect(response.body.acknowledged).toBe(true);
      expect(response.body.insertedId).toBe("don-123");
      expect(response.body.donationResult.insertedId).toBe("don-123");
      expect(response.body.donation).toBe(75);
      expect(response.body.email).toBe(validDonorEmail);
    });

    it("supports legacy /donations path with backward compatibility", async () => {
      const token = generateToken(validDonorEmail, "user");
      mockCampaignsRepo.findById.mockResolvedValue(sampleCampaign);
      mockDonationsRepo.create.mockResolvedValue({
        id: "don-123",
        pet_id: validObjectId,
        donation: 30,
        email: validDonorEmail,
        date: "2026-09-19",
        transactionId: "txn_test_111",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post("/donations")
        .set("Authorization", `Bearer ${token}`)
        .send({
          pet_id: validObjectId,
          donation: 30,
          transactionId: "txn_test_111",
        });

      expect(response.status).toBe(201);
      expect(response.body.donationResult.insertedId).toBe("don-123");
    });

    it("returns 404 when target campaign does not exist", async () => {
      const token = generateToken(validDonorEmail, "user");
      mockCampaignsRepo.findById.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/donations")
        .set("Authorization", `Bearer ${token}`)
        .send({
          pet_id: validObjectId,
          donation: 50,
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain("not found");
    });

    it("returns 400 when campaign id is malformed", async () => {
      const token = generateToken(validDonorEmail, "user");

      const response = await request(app)
        .post("/api/v1/donations")
        .set("Authorization", `Bearer ${token}`)
        .send({
          pet_id: "not-a-valid-objectid",
          donation: 50,
        });

      expect(response.status).toBe(400);
    });

    it("returns 401 when authorization token is missing", async () => {
      const response = await request(app)
        .post("/api/v1/donations")
        .send({
          pet_id: validObjectId,
          donation: 50,
        });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/v1/donations/user/me (Personal Donation History)", () => {
    it("returns personal donation history grouped by campaign", async () => {
      const token = generateToken(validDonorEmail, "user");
      mockDonationsRepo.findGroupedByCampaignForDonor.mockResolvedValue([
        {
          _id: validObjectId,
          id: validObjectId,
          pet_name: "Buddy",
          totalUserDonation: 120,
          donationDetails: [
            {
              email: validDonorEmail,
              donation: 70,
              donatedAt: "2026-09-10",
              date: "2026-09-10",
              transactionId: "txn_1",
            },
            {
              email: validDonorEmail,
              donation: 50,
              donatedAt: "2026-09-15",
              date: "2026-09-15",
              transactionId: "txn_2",
            },
          ],
        },
      ]);

      const response = await request(app)
        .get("/api/v1/donations/user/me")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]._id).toBe(validObjectId);
      expect(response.body[0].pet_name).toBe("Buddy");
      expect(response.body[0].totalUserDonation).toBe(120);
      expect(response.body[0].donationDetails).toHaveLength(2);
    });

    it("supports legacy /my-donations endpoint alias", async () => {
      const token = generateToken(validDonorEmail, "user");
      mockDonationsRepo.findGroupedByCampaignForDonor.mockResolvedValue([]);

      const response = await request(app)
        .get(`/my-donations?email=${validDonorEmail}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("returns 401 when authorization token is missing", async () => {
      const response = await request(app).get("/api/v1/donations/user/me");
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/v1/donations/campaign/:campaignId/total (Campaign Total)", () => {
    it("returns aggregated funds for a specific campaign", async () => {
      const token = generateToken(validDonorEmail, "user");
      mockCampaignsRepo.findById.mockResolvedValue(sampleCampaign);
      mockDonationsRepo.getTotalDonationsByCampaignId.mockResolvedValue(350);

      const response = await request(app)
        .get(`/api/v1/donations/campaign/${validObjectId}/total`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.totalDonations).toBe(350);
      expect(response.body.campaignId).toBe(validObjectId);
    });

    it("supports legacy /donations/total/:petId endpoint alias", async () => {
      const token = generateToken(validDonorEmail, "user");
      mockCampaignsRepo.findById.mockResolvedValue(sampleCampaign);
      mockDonationsRepo.getTotalDonationsByCampaignId.mockResolvedValue(350);

      const response = await request(app)
        .get(`/donations/total/${validObjectId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.totalDonations).toBe(350);
    });

    it("returns 404 if target campaign does not exist", async () => {
      const token = generateToken(validDonorEmail, "user");
      mockCampaignsRepo.findById.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/v1/donations/campaign/${validObjectId}/total`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it("returns 400 if campaignId is malformed", async () => {
      const token = generateToken(validDonorEmail, "user");

      const response = await request(app)
        .get("/api/v1/donations/campaign/invalid-id/total")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/v1/donations/admin/all (Admin All Donations)", () => {
    it("returns platform-wide campaign donation summaries when user is admin", async () => {
      const adminToken = generateToken("admin@example.com", "admin");
      mockUsersRepo.findByEmail.mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        role: "admin",
      });
      mockDonationsRepo.findAllAdminGrouped.mockResolvedValue([
        {
          _id: validObjectId,
          id: validObjectId,
          pet_name: "Buddy",
          max_donation: 500,
          totalDonations: 250,
          donors: ["donor1@example.com", "donor2@example.com"],
          donationsDetail: [
            { email: "donor1@example.com", donation: 150 },
            { email: "donor2@example.com", donation: 100 },
          ],
        },
      ]);

      const response = await request(app)
        .get("/api/v1/donations/admin/all")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0]._id).toBe(validObjectId);
      expect(response.body[0].pet_name).toBe("Buddy");
      expect(response.body[0].totalDonations).toBe(250);
      expect(response.body[0].donors).toHaveLength(2);
    });

    it("supports legacy /all-donations path for admin", async () => {
      const adminToken = generateToken("admin@example.com", "admin");
      mockUsersRepo.findByEmail.mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        role: "admin",
      });
      mockDonationsRepo.findAllAdminGrouped.mockResolvedValue([]);

      const response = await request(app)
        .get("/all-donations")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("returns 403 when user is not an administrator", async () => {
      const userToken = generateToken(validDonorEmail, "user");
      mockUsersRepo.findByEmail.mockResolvedValue({
        id: "user-1",
        email: validDonorEmail,
        role: "user",
      });

      const response = await request(app)
        .get("/api/v1/donations/admin/all")
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it("returns 401 when token is missing", async () => {
      const response = await request(app).get("/api/v1/donations/admin/all");
      expect(response.status).toBe(401);
    });
  });
});
