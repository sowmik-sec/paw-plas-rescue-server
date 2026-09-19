import { prisma as defaultPrisma } from "../../core/db/prisma";
import { PrismaClient, DonationCampaign, Prisma } from "@prisma/client";

export interface DonorDonation {
  id: string;
  donation: number;
  email: string;
  date?: string | null;
  transactionId?: string | null;
  createdAt?: Date;
}

export interface DonorGroup {
  _id: string;
  email: string;
  totalDonation: number;
  donations: DonorDonation[];
}

export type CampaignWithAggregates = DonationCampaign & {
  totalAmount: number;
  remainingDays: number;
};

export type CampaignWithDonations = DonationCampaign & {
  totalAmount: number;
  remainingDays: number;
  donations: DonorGroup[];
};

export interface PaginatedCampaignsResult {
  campaigns: CampaignWithAggregates[];
  totalPages: number;
  currentPage: number;
  totalCampaigns: number;
}

export function calculateRemainingDays(
  lastDateStr: string,
  now: Date = new Date()
): number {
  if (!lastDateStr) return 0;
  const targetDate = new Date(lastDateStr);
  if (isNaN(targetDate.getTime())) {
    return 0;
  }
  // Difference in milliseconds
  const diffMs = targetDate.getTime() - now.getTime();
  if (diffMs <= 0) {
    return 0;
  }
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export interface ICampaignsRepository {
  findPaginated(options: {
    page: number;
    limit: number;
  }): Promise<PaginatedCampaignsResult>;
  findById(id: string): Promise<DonationCampaign | null>;
  findByIdWithDonations(id: string): Promise<CampaignWithDonations | null>;
  findByCreatorEmail(email: string): Promise<CampaignWithAggregates[]>;
  findAllWithAggregates(): Promise<CampaignWithAggregates[]>;
  create(data: Prisma.DonationCampaignCreateInput): Promise<DonationCampaign>;
  update(
    id: string,
    data: Prisma.DonationCampaignUpdateInput
  ): Promise<DonationCampaign>;
  delete(id: string): Promise<DonationCampaign>;
}

export class CampaignsRepository implements ICampaignsRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  async findPaginated(options: {
    page: number;
    limit: number;
  }): Promise<PaginatedCampaignsResult> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [campaigns, totalCampaigns] = await Promise.all([
      this.prisma.donationCampaign.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.donationCampaign.count(),
    ]);

    if (campaigns.length === 0) {
      return {
        campaigns: [],
        totalPages: 0,
        currentPage: page,
        totalCampaigns: 0,
      };
    }

    const campaignIds = campaigns.map((c) => c.id);
    const donations = await this.prisma.donation.findMany({
      where: {
        pet_id: { in: campaignIds },
      },
    });

    const totalsMap = new Map<string, number>();
    for (const d of donations) {
      const current = totalsMap.get(d.pet_id) || 0;
      totalsMap.set(d.pet_id, current + (d.donation || 0));
    }

    const campaignsWithAggregates: CampaignWithAggregates[] = campaigns.map(
      (c) => ({
        ...c,
        totalAmount: totalsMap.get(c.id) || 0,
        remainingDays: calculateRemainingDays(c.last_date),
      })
    );

    const totalPages =
      Math.ceil(totalCampaigns / limit) || (totalCampaigns > 0 ? 1 : 0);

    return {
      campaigns: campaignsWithAggregates,
      totalPages,
      currentPage: page,
      totalCampaigns,
    };
  }

  async findById(id: string): Promise<DonationCampaign | null> {
    return this.prisma.donationCampaign.findUnique({
      where: { id },
    });
  }

  async findByIdWithDonations(
    id: string
  ): Promise<CampaignWithDonations | null> {
    const campaign = await this.prisma.donationCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return null;
    }

    const donations = await this.prisma.donation.findMany({
      where: { pet_id: id },
      orderBy: { createdAt: "desc" },
    });

    // Group donations by donor email
    const donorGroupsMap = new Map<
      string,
      { email: string; totalDonation: number; donations: DonorDonation[] }
    >();

    let totalAmount = 0;
    for (const d of donations) {
      totalAmount += d.donation || 0;
      const existing = donorGroupsMap.get(d.email) || {
        email: d.email,
        totalDonation: 0,
        donations: [],
      };
      existing.totalDonation += d.donation || 0;
      existing.donations.push({
        id: d.id,
        donation: d.donation,
        email: d.email,
        date: d.date,
        transactionId: d.transactionId,
        createdAt: d.createdAt,
      });
      donorGroupsMap.set(d.email, existing);
    }

    const donorGroups: DonorGroup[] = Array.from(
      donorGroupsMap.entries()
    ).map(([email, group]) => ({
      _id: email,
      email: group.email,
      totalDonation: group.totalDonation,
      donations: group.donations,
    }));

    return {
      ...campaign,
      totalAmount,
      remainingDays: calculateRemainingDays(campaign.last_date),
      donations: donorGroups,
    };
  }

  async findByCreatorEmail(email: string): Promise<CampaignWithAggregates[]> {
    const campaigns = await this.prisma.donationCampaign.findMany({
      where: {
        creator_info: {
          is: {
            email,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (campaigns.length === 0) {
      return [];
    }

    const campaignIds = campaigns.map((c) => c.id);
    const donations = await this.prisma.donation.findMany({
      where: {
        pet_id: { in: campaignIds },
      },
    });

    const totalsMap = new Map<string, number>();
    for (const d of donations) {
      const current = totalsMap.get(d.pet_id) || 0;
      totalsMap.set(d.pet_id, current + (d.donation || 0));
    }

    return campaigns.map((c) => ({
      ...c,
      totalAmount: totalsMap.get(c.id) || 0,
      remainingDays: calculateRemainingDays(c.last_date),
    }));
  }

  async findAllWithAggregates(): Promise<CampaignWithAggregates[]> {
    const campaigns = await this.prisma.donationCampaign.findMany({
      orderBy: { createdAt: "desc" },
    });

    if (campaigns.length === 0) {
      return [];
    }

    const campaignIds = campaigns.map((c) => c.id);
    const donations = await this.prisma.donation.findMany({
      where: {
        pet_id: { in: campaignIds },
      },
    });

    const totalsMap = new Map<string, number>();
    for (const d of donations) {
      const current = totalsMap.get(d.pet_id) || 0;
      totalsMap.set(d.pet_id, current + (d.donation || 0));
    }

    return campaigns.map((c) => ({
      ...c,
      totalAmount: totalsMap.get(c.id) || 0,
      remainingDays: calculateRemainingDays(c.last_date),
    }));
  }

  async create(
    data: Prisma.DonationCampaignCreateInput
  ): Promise<DonationCampaign> {
    return this.prisma.donationCampaign.create({
      data,
    });
  }

  async update(
    id: string,
    data: Prisma.DonationCampaignUpdateInput
  ): Promise<DonationCampaign> {
    return this.prisma.donationCampaign.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<DonationCampaign> {
    return this.prisma.donationCampaign.delete({
      where: { id },
    });
  }
}

export const campaignsRepository = new CampaignsRepository();
