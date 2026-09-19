import { describe, it, expect, beforeEach } from "vitest";
import { DonationsService } from "../../src/features/donations/donations.service";
import {
  IDonationsRepository,
  DonorCampaignGroup,
  AdminCampaignDonationSummary,
} from "../../src/features/donations/donations.repository";
import {
  ICampaignsRepository,
  PaginatedCampaignsResult,
  CampaignWithAggregates,
  CampaignWithDonations,
} from "../../src/features/campaigns/campaigns.repository";
import { FakePaymentAdapter } from "../../src/core/payment/fake-payment.adapter";
import {
  NotFoundError,
  ValidationError,
} from "../../src/core/errors/app-error";
import { Donation, DonationCampaign, Prisma } from "@prisma/client";

class MockDonationsRepository implements IDonationsRepository {
  public donations: Donation[] = [];
  public campaigns: DonationCampaign[] = [];

  async create(data: Prisma.DonationCreateInput): Promise<Donation> {
    const newDonation: Donation = {
      id: `don-${this.donations.length + 1}`,
      pet_id: data.pet_id,
      donation: data.donation,
      email: data.email,
      date: data.date || "2026-09-19",
      transactionId: data.transactionId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.donations.push(newDonation);
    return newDonation;
  }

  async findByCampaignId(campaignId: string): Promise<Donation[]> {
    return this.donations.filter((d) => d.pet_id === campaignId);
  }

  async findByDonorEmail(email: string): Promise<Donation[]> {
    return this.donations.filter((d) => d.email === email);
  }

  async findGroupedByCampaignForDonor(
    email: string
  ): Promise<DonorCampaignGroup[]> {
    const userDonations = this.donations.filter((d) => d.email === email);
    if (userDonations.length === 0) return [];

    const groupedMap = new Map<
      string,
      {
        pet_name: string;
        totalUserDonation: number;
        donationDetails: any[];
      }
    >();

    for (const d of userDonations) {
      const camp = this.campaigns.find((c) => c.id === d.pet_id);
      const petName = camp ? camp.pet_name : "Unknown Campaign";

      const existing = groupedMap.get(d.pet_id) || {
        pet_name: petName,
        totalUserDonation: 0,
        donationDetails: [],
      };

      existing.totalUserDonation += d.donation;
      existing.donationDetails.push({
        email: d.email,
        donation: d.donation,
        donatedAt: d.date,
        date: d.date,
        transactionId: d.transactionId,
      });
      groupedMap.set(d.pet_id, existing);
    }

    return Array.from(groupedMap.entries()).map(([campaignId, group]) => ({
      _id: campaignId,
      id: campaignId,
      pet_name: group.pet_name,
      totalUserDonation: group.totalUserDonation,
      donationDetails: group.donationDetails,
    }));
  }

  async getTotalDonationsByCampaignId(campaignId: string): Promise<number> {
    return this.donations
      .filter((d) => d.pet_id === campaignId)
      .reduce((sum, d) => sum + d.donation, 0);
  }

  async findAllAdminGrouped(): Promise<AdminCampaignDonationSummary[]> {
    return this.campaigns.map((camp) => {
      const campDonations = this.donations.filter((d) => d.pet_id === camp.id);
      const total = campDonations.reduce((sum, d) => sum + d.donation, 0);
      const donors = Array.from(new Set(campDonations.map((d) => d.email)));
      const donationsDetail = campDonations.map((d) => ({
        email: d.email,
        donation: d.donation,
        date: d.date,
        transactionId: d.transactionId,
      }));

      return {
        _id: camp.id,
        id: camp.id,
        pet_name: camp.pet_name,
        max_donation: camp.max_donation,
        short_description: camp.short_description,
        long_description: camp.long_description,
        last_date: camp.last_date,
        pet_image: camp.pet_image,
        totalDonations: total,
        donors,
        donationsDetail,
      };
    });
  }

  async findAll(): Promise<Donation[]> {
    return [...this.donations];
  }
}

class MockCampaignsRepository implements ICampaignsRepository {
  public campaigns: DonationCampaign[] = [];

  async findPaginated(_options: {
    page: number;
    limit: number;
  }): Promise<PaginatedCampaignsResult> {
    return {
      campaigns: [],
      totalPages: 0,
      currentPage: 1,
      totalCampaigns: 0,
    };
  }

  async findById(id: string): Promise<DonationCampaign | null> {
    return this.campaigns.find((c) => c.id === id) || null;
  }

  async findByIdWithDonations(
    _id: string
  ): Promise<CampaignWithDonations | null> {
    return null;
  }

  async findByCreatorEmail(
    _email: string
  ): Promise<CampaignWithAggregates[]> {
    return [];
  }

  async findAllWithAggregates(): Promise<CampaignWithAggregates[]> {
    return [];
  }

  async create(
    data: Prisma.DonationCampaignCreateInput
  ): Promise<DonationCampaign> {
    const newCamp: DonationCampaign = {
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
    this.campaigns.push(newCamp);
    return newCamp;
  }

  async update(
    id: string,
    data: Prisma.DonationCampaignUpdateInput
  ): Promise<DonationCampaign> {
    const camp = this.campaigns.find((c) => c.id === id);
    if (!camp) throw new Error("Campaign not found");
    Object.assign(camp, data);
    return camp;
  }

  async delete(id: string): Promise<DonationCampaign> {
    const idx = this.campaigns.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Campaign not found");
    const [deleted] = this.campaigns.splice(idx, 1);
    return deleted;
  }
}

describe("DonationsService", () => {
  let donationsRepo: MockDonationsRepository;
  let campaignsRepo: MockCampaignsRepository;
  let paymentGateway: FakePaymentAdapter;
  let service: DonationsService;

  const sampleCampaign: DonationCampaign = {
    id: "camp-100",
    pet_name: "Buddy",
    max_donation: 1000,
    last_date: "2026-12-31",
    short_description: "Help Buddy walk again",
    long_description: "Detailed surgery funding for Buddy",
    pet_image: "https://example.com/buddy.jpg",
    donation_created_at: "2026-09-01",
    creator_info: {
      name: "Alice Campaigner",
      email: "alice@example.com",
    },
    createdAt: new Date("2026-09-01"),
    updatedAt: new Date("2026-09-01"),
  };

  beforeEach(() => {
    donationsRepo = new MockDonationsRepository();
    campaignsRepo = new MockCampaignsRepository();
    paymentGateway = new FakePaymentAdapter();

    campaignsRepo.campaigns = [sampleCampaign];
    donationsRepo.campaigns = [sampleCampaign];

    service = new DonationsService(
      donationsRepo,
      campaignsRepo,
      paymentGateway
    );
  });

  describe("createPaymentIntent", () => {
    it("generates a client secret via payment gateway for valid donation amount", async () => {
      const result = await service.createPaymentIntent(50, "donor@example.com");

      expect(result.clientSecret).toBeDefined();
      expect(result.id).toBeDefined();
      expect(paymentGateway.intents).toHaveLength(1);
      expect(paymentGateway.intents[0].amountInCents).toBe(5000); // $50.00 in cents
    });

    it("throws ValidationError for non-positive donation amount", async () => {
      await expect(service.createPaymentIntent(0)).rejects.toThrow(
        ValidationError
      );
      await expect(service.createPaymentIntent(-20)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("recordDonation", () => {
    it("successfully records a donation contribution linked to a campaign and donor email", async () => {
      const input = {
        pet_id: "camp-100",
        donation: 75,
        transactionId: "txn_stripe_12345",
        date: "2026-09-19",
      };

      const result = await service.recordDonation(input, {
        email: "donor@example.com",
        name: "Generous Donor",
      });

      expect(result.id).toBe("don-1");
      expect(result.pet_id).toBe("camp-100");
      expect(result.donation).toBe(75);
      expect(result.email).toBe("donor@example.com");
      expect(result.transactionId).toBe("txn_stripe_12345");
      expect(result.acknowledged).toBe(true);
      expect(result.insertedId).toBe("don-1");
      expect(result.donationResult.insertedId).toBe("don-1");
    });

    it("throws NotFoundError if campaign does not exist", async () => {
      const input = {
        pet_id: "camp-999-missing",
        donation: 100,
      };

      await expect(
        service.recordDonation(input, { email: "donor@example.com" })
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError if donor email cannot be resolved", async () => {
      const input = {
        pet_id: "camp-100",
        donation: 50,
      };

      await expect(service.recordDonation(input, undefined)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("getDonorDonations", () => {
    beforeEach(async () => {
      await service.recordDonation(
        { pet_id: "camp-100", donation: 50, date: "2026-09-10" },
        { email: "donor@example.com" }
      );
      await service.recordDonation(
        { pet_id: "camp-100", donation: 30, date: "2026-09-15" },
        { email: "donor@example.com" }
      );
    });

    it("returns donation history grouped by campaign with totals and dates", async () => {
      const groups = await service.getDonorDonations("donor@example.com");

      expect(groups).toHaveLength(1);
      expect(groups[0]._id).toBe("camp-100");
      expect(groups[0].pet_name).toBe("Buddy");
      expect(groups[0].totalUserDonation).toBe(80);
      expect(groups[0].donationDetails).toHaveLength(2);
      expect(groups[0].donationDetails[0].donation).toBe(50);
      expect(groups[0].donationDetails[1].donation).toBe(30);
    });

    it("returns empty array when donor has made no contributions", async () => {
      const groups = await service.getDonorDonations("other@example.com");
      expect(groups).toHaveLength(0);
    });

    it("throws ValidationError if email is empty", async () => {
      await expect(service.getDonorDonations("")).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("getCampaignTotal", () => {
    it("returns aggregated funds for a specific campaign", async () => {
      await service.recordDonation(
        { pet_id: "camp-100", donation: 100 },
        { email: "donor1@example.com" }
      );
      await service.recordDonation(
        { pet_id: "camp-100", donation: 150 },
        { email: "donor2@example.com" }
      );

      const totalResult = await service.getCampaignTotal("camp-100");
      expect(totalResult.campaignId).toBe("camp-100");
      expect(totalResult.totalDonations).toBe(250);
    });

    it("throws NotFoundError when campaign does not exist", async () => {
      await expect(service.getCampaignTotal("nonexistent-id")).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("getAllDonationsForAdmin", () => {
    it("returns platform-wide campaigns with aggregate totals and unique donor lists", async () => {
      await service.recordDonation(
        { pet_id: "camp-100", donation: 100 },
        { email: "donor1@example.com" }
      );
      await service.recordDonation(
        { pet_id: "camp-100", donation: 200 },
        { email: "donor2@example.com" }
      );

      const summaries = await service.getAllDonationsForAdmin();

      expect(summaries).toHaveLength(1);
      expect(summaries[0].pet_name).toBe("Buddy");
      expect(summaries[0].totalDonations).toBe(300);
      expect(summaries[0].donors).toContain("donor1@example.com");
      expect(summaries[0].donors).toContain("donor2@example.com");
      expect(summaries[0].donationsDetail).toHaveLength(2);
    });
  });
});
