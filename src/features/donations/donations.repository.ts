import { prisma as defaultPrisma } from "../../core/db/prisma";
import { PrismaClient, Donation, Prisma } from "@prisma/client";

export interface UserDonationDetail {
  email: string;
  donation: number;
  donatedAt?: string | null;
  date?: string | null;
  transactionId?: string | null;
}

export interface DonorCampaignGroup {
  _id: string;
  id: string;
  pet_name: string;
  totalUserDonation: number;
  donationDetails: UserDonationDetail[];
}

export interface AdminDonationDetail {
  email: string;
  donation: number;
  date?: string | null;
  transactionId?: string | null;
}

export interface AdminCampaignDonationSummary {
  _id: string;
  id: string;
  pet_name: string;
  max_donation: number;
  short_description?: string;
  long_description?: string | null;
  last_date?: string;
  pet_image?: string | null;
  totalDonations: number;
  donors: string[];
  donationsDetail: AdminDonationDetail[];
}

export interface IDonationsRepository {
  create(data: Prisma.DonationCreateInput): Promise<Donation>;
  findByCampaignId(campaignId: string): Promise<Donation[]>;
  findByDonorEmail(email: string): Promise<Donation[]>;
  findGroupedByCampaignForDonor(email: string): Promise<DonorCampaignGroup[]>;
  getTotalDonationsByCampaignId(campaignId: string): Promise<number>;
  findAllAdminGrouped(): Promise<AdminCampaignDonationSummary[]>;
  findAll(): Promise<Donation[]>;
}

export class DonationsRepository implements IDonationsRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  async create(data: Prisma.DonationCreateInput): Promise<Donation> {
    return this.prisma.donation.create({
      data,
    });
  }

  async findByCampaignId(campaignId: string): Promise<Donation[]> {
    return this.prisma.donation.findMany({
      where: { pet_id: campaignId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByDonorEmail(email: string): Promise<Donation[]> {
    return this.prisma.donation.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
    });
  }

  async findGroupedByCampaignForDonor(
    email: string
  ): Promise<DonorCampaignGroup[]> {
    const userDonations = await this.prisma.donation.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (userDonations.length === 0) {
      return [];
    }

    const campaignIds = Array.from(
      new Set(userDonations.map((d) => d.pet_id))
    );

    const campaigns = await this.prisma.donationCampaign.findMany({
      where: {
        id: { in: campaignIds },
      },
    });

    const campaignMap = new Map(campaigns.map((c) => [c.id, c]));

    // Group user donations by campaign
    const groupedMap = new Map<
      string,
      {
        pet_name: string;
        totalUserDonation: number;
        donationDetails: UserDonationDetail[];
      }
    >();

    for (const d of userDonations) {
      const campaign = campaignMap.get(d.pet_id);
      const petName = campaign ? campaign.pet_name : "Unknown Campaign";

      const existing = groupedMap.get(d.pet_id) || {
        pet_name: petName,
        totalUserDonation: 0,
        donationDetails: [],
      };

      existing.totalUserDonation += d.donation;
      existing.donationDetails.push({
        email: d.email,
        donation: d.donation,
        donatedAt: d.date || d.createdAt.toISOString(),
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
    const donations = await this.prisma.donation.findMany({
      where: { pet_id: campaignId },
      select: { donation: true },
    });

    return donations.reduce((sum, item) => sum + (item.donation || 0), 0);
  }

  async findAllAdminGrouped(): Promise<AdminCampaignDonationSummary[]> {
    const [campaigns, donations] = await Promise.all([
      this.prisma.donationCampaign.findMany({
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.donation.findMany({
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Group donations by campaign id
    const donationsByCampaign = new Map<
      string,
      {
        totalDonations: number;
        donors: Set<string>;
        donationsDetail: AdminDonationDetail[];
      }
    >();

    for (const d of donations) {
      const existing = donationsByCampaign.get(d.pet_id) || {
        totalDonations: 0,
        donors: new Set<string>(),
        donationsDetail: [],
      };

      existing.totalDonations += d.donation || 0;
      if (d.email) {
        existing.donors.add(d.email);
      }
      existing.donationsDetail.push({
        email: d.email,
        donation: d.donation,
        date: d.date,
        transactionId: d.transactionId,
      });

      donationsByCampaign.set(d.pet_id, existing);
    }

    return campaigns.map((c) => {
      const donationGroup = donationsByCampaign.get(c.id);
      return {
        _id: c.id,
        id: c.id,
        pet_name: c.pet_name,
        max_donation: c.max_donation,
        short_description: c.short_description,
        long_description: c.long_description,
        last_date: c.last_date,
        pet_image: c.pet_image,
        totalDonations: donationGroup?.totalDonations || 0,
        donors: donationGroup ? Array.from(donationGroup.donors) : [],
        donationsDetail: donationGroup ? donationGroup.donationsDetail : [],
      };
    });
  }

  async findAll(): Promise<Donation[]> {
    return this.prisma.donation.findMany({
      orderBy: { createdAt: "desc" },
    });
  }
}

export const donationsRepository = new DonationsRepository();
