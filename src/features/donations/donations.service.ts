import {
  IDonationsRepository,
  donationsRepository as defaultDonationsRepository,
  DonorCampaignGroup,
  AdminCampaignDonationSummary,
} from "./donations.repository";
import {
  ICampaignsRepository,
  campaignsRepository as defaultCampaignsRepository,
} from "../campaigns/campaigns.repository";
import {
  IPaymentGateway,
  PaymentIntentResult,
} from "../../core/payment/payment-gateway.interface";
import { stripePaymentAdapter } from "../../core/payment/stripe-payment.adapter";
import {
  NotFoundError,
  ValidationError,
} from "../../core/errors/app-error";
import { CreateDonationInput } from "./donations.schema";
import { Donation } from "@prisma/client";

export interface DonationRecordResult extends Donation {
  _id: string;
  acknowledged: boolean;
  insertedId: string;
  donationResult: {
    acknowledged: boolean;
    insertedId: string;
  };
}

export class DonationsService {
  private donationsRepo: IDonationsRepository;
  private campaignsRepo: ICampaignsRepository;
  private paymentGateway: IPaymentGateway;

  constructor(
    donationsRepo?: IDonationsRepository,
    campaignsRepo?: ICampaignsRepository,
    paymentGateway?: IPaymentGateway
  ) {
    this.donationsRepo = donationsRepo || defaultDonationsRepository;
    this.campaignsRepo = campaignsRepo || defaultCampaignsRepository;
    this.paymentGateway = paymentGateway || stripePaymentAdapter;
  }

  /**
   * Generates a Stripe client secret for a valid donation amount.
   */
  async createPaymentIntent(
    donationAmount: number,
    _userEmail?: string
  ): Promise<PaymentIntentResult> {
    if (!donationAmount || isNaN(donationAmount) || donationAmount <= 0) {
      throw new ValidationError(
        "Donation amount must be a positive number greater than 0"
      );
    }

    const amountInCents = Math.round(donationAmount * 100);
    return this.paymentGateway.createPaymentIntent(amountInCents, "usd");
  }

  /**
   * Records a confirmed donation contribution linked to a campaign and donor.
   */
  async recordDonation(
    input: CreateDonationInput,
    user?: { email?: string; name?: string }
  ): Promise<DonationRecordResult> {
    const campaign = await this.campaignsRepo.findById(input.pet_id);
    if (!campaign) {
      throw new NotFoundError(`Donation campaign not found: ${input.pet_id}`);
    }

    const email = input.email || user?.email;
    if (!email) {
      throw new ValidationError("Donor email is required");
    }

    const date =
      input.date ||
      new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    const created = await this.donationsRepo.create({
      pet_id: input.pet_id,
      donation: input.donation,
      email,
      date,
      transactionId: input.transactionId || null,
    });

    return {
      ...created,
      _id: created.id,
      acknowledged: true,
      insertedId: created.id,
      donationResult: {
        acknowledged: true,
        insertedId: created.id,
      },
    };
  }

  /**
   * Retrieves all donations made by the authenticated donor, grouped by campaign.
   */
  async getDonorDonations(email: string): Promise<DonorCampaignGroup[]> {
    if (!email) {
      throw new ValidationError("User email is required");
    }

    return this.donationsRepo.findGroupedByCampaignForDonor(email);
  }

  /**
   * Returns aggregated donation funds for a specific campaign.
   */
  async getCampaignTotal(
    campaignId: string
  ): Promise<{ totalDonations: number; campaignId: string }> {
    const campaign = await this.campaignsRepo.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError(`Donation campaign not found: ${campaignId}`);
    }

    const totalDonations =
      await this.donationsRepo.getTotalDonationsByCampaignId(campaignId);

    return {
      totalDonations,
      campaignId,
    };
  }

  /**
   * Returns platform-wide campaign donation summaries for administrators.
   */
  async getAllDonationsForAdmin(): Promise<AdminCampaignDonationSummary[]> {
    return this.donationsRepo.findAllAdminGrouped();
  }
}

export const donationsService = new DonationsService();
