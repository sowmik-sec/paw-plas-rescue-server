import {
  ICampaignsRepository,
  campaignsRepository as defaultCampaignsRepository,
  CampaignWithAggregates,
  CampaignWithDonations,
  PaginatedCampaignsResult,
  calculateRemainingDays,
} from "./campaigns.repository";
import {
  IMediaStorage,
  UploadFile,
} from "../../core/storage/media-storage.interface";
import { cloudinaryMediaAdapter as defaultCloudinaryAdapter } from "../../core/storage/cloudinary-media.adapter";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../core/errors/app-error";
import {
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignQuery,
} from "./campaigns.schema";
import { DonationCampaign } from "@prisma/client";

export { calculateRemainingDays };

export interface CurrentUserPayload {
  email: string;
  name?: string;
  role?: string;
}

export class CampaignsService {
  private campaignsRepo: ICampaignsRepository;
  private mediaStorage: IMediaStorage;

  constructor(
    campaignsRepository?: ICampaignsRepository,
    mediaStorage?: IMediaStorage
  ) {
    this.campaignsRepo = campaignsRepository || defaultCampaignsRepository;
    this.mediaStorage = mediaStorage || defaultCloudinaryAdapter;
  }

  async getPaginatedCampaigns(
    query: CampaignQuery
  ): Promise<PaginatedCampaignsResult> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    return this.campaignsRepo.findPaginated({
      page,
      limit,
    });
  }

  async getCampaignById(id: string): Promise<CampaignWithDonations> {
    const campaign = await this.campaignsRepo.findByIdWithDonations(id);
    if (!campaign) {
      throw new NotFoundError(`Donation campaign not found with id: ${id}`);
    }
    return campaign;
  }

  async createCampaign(
    input: CreateCampaignInput,
    file?: UploadFile,
    currentUser?: CurrentUserPayload
  ): Promise<DonationCampaign> {
    let imageUrl: string;

    if (file) {
      imageUrl = await this.mediaStorage.uploadImage(file, "campaigns");
    } else if (input.pet_image) {
      imageUrl = input.pet_image;
    } else {
      throw new ValidationError("Pet image is required");
    }

    const creatorInfo = input.creator_info || {
      name: currentUser?.name || "Campaign Creator",
      email: currentUser?.email || "",
    };

    if (!creatorInfo.email && currentUser?.email) {
      creatorInfo.email = currentUser.email;
    }

    const date = new Date();
    const formattedDate =
      input.donation_created_at ||
      `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

    return this.campaignsRepo.create({
      pet_name: input.pet_name,
      max_donation: input.max_donation,
      last_date: input.last_date,
      short_description: input.short_description,
      long_description: input.long_description || null,
      pet_image: imageUrl,
      donation_created_at: formattedDate,
      creator_info: {
        name: creatorInfo.name,
        email: creatorInfo.email,
      },
    });
  }

  async updateCampaign(
    id: string,
    input: UpdateCampaignInput,
    file?: UploadFile,
    currentUser?: CurrentUserPayload
  ): Promise<DonationCampaign> {
    const existing = await this.campaignsRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Donation campaign not found with id: ${id}`);
    }

    if (
      currentUser &&
      currentUser.role !== "admin" &&
      existing.creator_info.email !== currentUser.email
    ) {
      throw new ForbiddenError(
        "You are not authorized to update this donation campaign"
      );
    }

    let imageUrl = existing.pet_image;
    if (file) {
      imageUrl = await this.mediaStorage.uploadImage(file, "campaigns");
    } else if (input.pet_image) {
      imageUrl = input.pet_image;
    }

    const updatedData: any = {};
    if (input.pet_name !== undefined) updatedData.pet_name = input.pet_name;
    if (input.max_donation !== undefined)
      updatedData.max_donation = input.max_donation;
    if (input.last_date !== undefined) updatedData.last_date = input.last_date;
    if (input.short_description !== undefined)
      updatedData.short_description = input.short_description;
    if (input.long_description !== undefined)
      updatedData.long_description = input.long_description;
    if (input.donation_created_at !== undefined)
      updatedData.donation_created_at = input.donation_created_at;
    if (input.creator_info !== undefined)
      updatedData.creator_info = input.creator_info;
    if (imageUrl !== null && imageUrl !== undefined) {
      updatedData.pet_image = imageUrl;
    }

    return this.campaignsRepo.update(id, updatedData);
  }

  async deleteCampaign(
    id: string,
    currentUser?: CurrentUserPayload
  ): Promise<DonationCampaign> {
    const existing = await this.campaignsRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Donation campaign not found with id: ${id}`);
    }

    if (
      currentUser &&
      currentUser.role !== "admin" &&
      existing.creator_info.email !== currentUser.email
    ) {
      throw new ForbiddenError(
        "You are not authorized to delete this donation campaign"
      );
    }

    return this.campaignsRepo.delete(id);
  }

  async getCampaignsByCreator(
    email: string
  ): Promise<CampaignWithAggregates[]> {
    return this.campaignsRepo.findByCreatorEmail(email);
  }

  async getAllCampaignsForAdmin(): Promise<CampaignWithAggregates[]> {
    return this.campaignsRepo.findAllWithAggregates();
  }
}

export const campaignsService = new CampaignsService();
