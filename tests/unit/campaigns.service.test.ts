import { describe, it, expect, beforeEach } from "vitest";
import {
  CampaignsService,
  calculateRemainingDays,
} from "../../src/features/campaigns/campaigns.service";
import {
  ICampaignsRepository,
  PaginatedCampaignsResult,
  CampaignWithAggregates,
  CampaignWithDonations,
} from "../../src/features/campaigns/campaigns.repository";
import {
  IMediaStorage,
  UploadFile,
} from "../../src/core/storage/media-storage.interface";
import {
  NotFoundError,
  ValidationError,
} from "../../src/core/errors/app-error";
import { DonationCampaign, Prisma } from "@prisma/client";

class MockCampaignsRepository implements ICampaignsRepository {
  public campaigns: DonationCampaign[] = [];
  public donationTotals: Map<string, number> = new Map();
  public donorGroupsMap: Map<string, any[]> = new Map();

  async findPaginated(options: {
    page: number;
    limit: number;
  }): Promise<PaginatedCampaignsResult> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;
    const paged = this.campaigns.slice(skip, skip + limit);
    const totalCampaigns = this.campaigns.length;
    const totalPages = Math.ceil(totalCampaigns / limit) || (totalCampaigns > 0 ? 1 : 0);

    const campaignsWithAggregates: CampaignWithAggregates[] = paged.map((c) => ({
      ...c,
      totalAmount: this.donationTotals.get(c.id) || 0,
      remainingDays: calculateRemainingDays(c.last_date),
    }));

    return {
      campaigns: campaignsWithAggregates,
      totalPages,
      currentPage: page,
      totalCampaigns,
    };
  }

  async findById(id: string): Promise<DonationCampaign | null> {
    return this.campaigns.find((c) => c.id === id) || null;
  }

  async findByIdWithDonations(
    id: string
  ): Promise<CampaignWithDonations | null> {
    const campaign = this.campaigns.find((c) => c.id === id);
    if (!campaign) return null;

    const donations = this.donorGroupsMap.get(id) || [];
    return {
      ...campaign,
      totalAmount: this.donationTotals.get(id) || 0,
      remainingDays: calculateRemainingDays(campaign.last_date),
      donations,
    };
  }

  async findByCreatorEmail(email: string): Promise<CampaignWithAggregates[]> {
    const filtered = this.campaigns.filter(
      (c) => c.creator_info.email === email
    );
    return filtered.map((c) => ({
      ...c,
      totalAmount: this.donationTotals.get(c.id) || 0,
      remainingDays: calculateRemainingDays(c.last_date),
    }));
  }

  async findAllWithAggregates(): Promise<CampaignWithAggregates[]> {
    return this.campaigns.map((c) => ({
      ...c,
      totalAmount: this.donationTotals.get(c.id) || 0,
      remainingDays: calculateRemainingDays(c.last_date),
    }));
  }

  async create(
    data: Prisma.DonationCampaignCreateInput
  ): Promise<DonationCampaign> {
    const newCampaign: DonationCampaign = {
      id: `camp-${this.campaigns.length + 1}`,
      pet_name: data.pet_name,
      max_donation: data.max_donation,
      last_date: data.last_date,
      short_description: data.short_description,
      long_description: data.long_description || null,
      pet_image: data.pet_image || null,
      donation_created_at: data.donation_created_at || null,
      creator_info: data.creator_info as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.campaigns.push(newCampaign);
    return newCampaign;
  }

  async update(
    id: string,
    data: Prisma.DonationCampaignUpdateInput
  ): Promise<DonationCampaign> {
    const index = this.campaigns.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Campaign not found");
    this.campaigns[index] = {
      ...this.campaigns[index],
      ...data,
      updatedAt: new Date(),
    } as DonationCampaign;
    return this.campaigns[index];
  }

  async delete(id: string): Promise<DonationCampaign> {
    const index = this.campaigns.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Campaign not found");
    const [deleted] = this.campaigns.splice(index, 1);
    return deleted;
  }
}

class MockMediaStorage implements IMediaStorage {
  public uploadedFiles: { file: UploadFile; folder?: string }[] = [];

  async uploadImage(file: UploadFile, folder?: string): Promise<string> {
    this.uploadedFiles.push({ file, folder });
    return `https://mock-storage.example.com/${folder || "uploads"}/${file.originalname}`;
  }

  async deleteImage(_publicId: string): Promise<void> {}
}

describe("CampaignsService and Remaining Days Calculation", () => {
  let campaignsRepo: MockCampaignsRepository;
  let mediaStorage: MockMediaStorage;
  let service: CampaignsService;

  const sampleCampaign: DonationCampaign = {
    id: "camp-101",
    pet_name: "Max",
    max_donation: 500,
    last_date: "2026-10-30",
    short_description: "Help Max recover from surgery",
    long_description: "Max needs emergency medical attention for a fractured leg.",
    pet_image: "https://example.com/max.jpg",
    donation_created_at: "2026-09-01",
    creator_info: {
      name: "Alice Campaigner",
      email: "alice@example.com",
    },
    createdAt: new Date("2026-09-01"),
    updatedAt: new Date("2026-09-01"),
  };

  beforeEach(() => {
    campaignsRepo = new MockCampaignsRepository();
    mediaStorage = new MockMediaStorage();
    campaignsRepo.campaigns = [sampleCampaign];
    campaignsRepo.donationTotals.set("camp-101", 350);
    campaignsRepo.donorGroupsMap.set("camp-101", [
      {
        _id: "donor1@example.com",
        email: "donor1@example.com",
        totalDonation: 200,
        donations: [
          {
            id: "don-1",
            donation: 200,
            email: "donor1@example.com",
            date: "2026-09-05",
            transactionId: "txn_123",
          },
        ],
      },
      {
        _id: "donor2@example.com",
        email: "donor2@example.com",
        totalDonation: 150,
        donations: [
          {
            id: "don-2",
            donation: 150,
            email: "donor2@example.com",
            date: "2026-09-08",
            transactionId: "txn_456",
          },
        ],
      },
    ]);
    service = new CampaignsService(campaignsRepo, mediaStorage);
  });

  describe("calculateRemainingDays helper", () => {
    it("returns positive remaining days for future dates", () => {
      const baseNow = new Date("2026-09-19T00:00:00.000Z");
      const futureDate = "2026-09-24T00:00:00.000Z";
      const remaining = calculateRemainingDays(futureDate, baseNow);
      expect(remaining).toBe(5);
    });

    it("returns 1 for date-only format on the current deadline day before end of day", () => {
      const baseNow = new Date("2026-09-19T14:30:00.000Z");
      const deadlineDate = "2026-09-19";
      const remaining = calculateRemainingDays(deadlineDate, baseNow);
      expect(remaining).toBe(1);
    });

    it("returns 0 for expired past dates", () => {
      const baseNow = new Date("2026-09-19T00:00:00.000Z");
      const pastDate = "2026-09-10T00:00:00.000Z";
      const remaining = calculateRemainingDays(pastDate, baseNow);
      expect(remaining).toBe(0);
    });

    it("returns 0 for malformed or empty date strings", () => {
      expect(calculateRemainingDays("invalid-date")).toBe(0);
      expect(calculateRemainingDays("")).toBe(0);
    });
  });

  describe("getPaginatedCampaigns", () => {
    it("returns paginated campaigns with aggregated totals and remaining days", async () => {
      const result = await service.getPaginatedCampaigns({ page: 1, limit: 10 });

      expect(result.totalCampaigns).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.currentPage).toBe(1);
      expect(result.campaigns).toHaveLength(1);
      expect(result.campaigns[0].pet_name).toBe("Max");
      expect(result.campaigns[0].totalAmount).toBe(350);
      expect(typeof result.campaigns[0].remainingDays).toBe("number");
    });

    it("returns empty result when no campaigns exist", async () => {
      campaignsRepo.campaigns = [];
      const result = await service.getPaginatedCampaigns({ page: 1, limit: 10 });

      expect(result.totalCampaigns).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.campaigns).toHaveLength(0);
    });
  });

  describe("getCampaignById", () => {
    it("returns campaign details including donor contributions and creator info", async () => {
      const result = await service.getCampaignById("camp-101");

      expect(result.id).toBe("camp-101");
      expect(result.pet_name).toBe("Max");
      expect(result.max_donation).toBe(500);
      expect(result.totalAmount).toBe(350);
      expect(result.creator_info.email).toBe("alice@example.com");
      expect(result.donations).toHaveLength(2);
      expect(result.donations[0].email).toBe("donor1@example.com");
      expect(result.donations[0].totalDonation).toBe(200);
    });

    it("throws NotFoundError when campaign ID does not exist", async () => {
      await expect(service.getCampaignById("non-existent-id")).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("createCampaign", () => {
    const sampleUploadFile: UploadFile = {
      buffer: Buffer.from("fake-image"),
      originalname: "pet.jpg",
      mimetype: "image/jpeg",
      size: 1024,
    };

    it("successfully creates campaign with uploaded image via media storage seam", async () => {
      const input = {
        pet_name: "Bella",
        max_donation: 800,
        last_date: "2026-11-15",
        short_description: "Help Bella with medication",
        long_description: "Detailed description of Bella's condition.",
        creator_info: {
          name: "Bob Creator",
          email: "bob@example.com",
        },
      };

      const result = await service.createCampaign(input, sampleUploadFile, {
        email: "bob@example.com",
        name: "Bob Creator",
        role: "user",
      });

      expect(result.id).toBe("camp-2");
      expect(result.pet_name).toBe("Bella");
      expect(result.max_donation).toBe(800);
      expect(result.pet_image).toContain("https://mock-storage.example.com/campaigns/pet.jpg");
      expect(result.creator_info.email).toBe("bob@example.com");
      expect(mediaStorage.uploadedFiles).toHaveLength(1);
    });

    it("creates campaign with provided image url if no file uploaded", async () => {
      const input = {
        pet_name: "Charlie",
        max_donation: 400,
        last_date: "2026-12-01",
        short_description: "Shelter supply drive",
        pet_image: "https://example.com/existing-image.png",
      };

      const result = await service.createCampaign(input, undefined, {
        email: "bob@example.com",
        name: "Bob Creator",
        role: "user",
      });

      expect(result.pet_name).toBe("Charlie");
      expect(result.pet_image).toBe("https://example.com/existing-image.png");
      expect(result.creator_info.email).toBe("bob@example.com");
    });

    it("throws ValidationError when no image file or URL is provided", async () => {
      const input = {
        pet_name: "Luna",
        max_donation: 300,
        last_date: "2026-12-01",
        short_description: "Medical support",
      };

      await expect(
        service.createCampaign(input, undefined, {
          email: "bob@example.com",
          name: "Bob",
          role: "user",
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getCampaignsByCreator", () => {
    it("returns all campaigns created by a specific user email", async () => {
      const result = await service.getCampaignsByCreator("alice@example.com");

      expect(result).toHaveLength(1);
      expect(result[0].creator_info.email).toBe("alice@example.com");
      expect(result[0].totalAmount).toBe(350);
    });

    it("returns empty list if user has created no campaigns", async () => {
      const result = await service.getCampaignsByCreator("other@example.com");
      expect(result).toHaveLength(0);
    });
  });

  describe("getAllCampaignsForAdmin", () => {
    it("returns all platform-wide campaigns with aggregates", async () => {
      const result = await service.getAllCampaignsForAdmin();

      expect(result).toHaveLength(1);
      expect(result[0].pet_name).toBe("Max");
      expect(result[0].totalAmount).toBe(350);
    });
  });
});
