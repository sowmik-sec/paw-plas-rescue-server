import {
  IPetsRepository,
  petsRepository as defaultPetsRepository,
  PetWithDetails,
  AvailablePetsResult,
} from "./pets.repository";
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
import { CreatePetInput, UpdatePetInput, PetQuery } from "./pets.schema";
import { Pet } from "@prisma/client";

export interface CurrentUserPayload {
  email: string;
  name?: string;
  role?: string;
}

export class PetsService {
  private petsRepo: IPetsRepository;
  private mediaStorage: IMediaStorage;

  constructor(
    petsRepository?: IPetsRepository,
    mediaStorage?: IMediaStorage
  ) {
    this.petsRepo = petsRepository || defaultPetsRepository;
    this.mediaStorage = mediaStorage || defaultCloudinaryAdapter;
  }

  async getAvailablePets(query: PetQuery): Promise<AvailablePetsResult> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const category = query.category || "all";

    return this.petsRepo.findAvailablePets({
      category,
      page,
      limit,
    });
  }

  async getPetById(id: string): Promise<PetWithDetails> {
    const pet = await this.petsRepo.findByIdWithDetails(id);
    if (!pet) {
      throw new NotFoundError(`Pet not found with id: ${id}`);
    }
    return pet;
  }

  async createPet(
    input: CreatePetInput,
    file?: UploadFile,
    currentUser?: CurrentUserPayload
  ): Promise<Pet> {
    let imageUrl: string;

    if (file) {
      imageUrl = await this.mediaStorage.uploadImage(file, "pets");
    } else if ((input as any).pet_image) {
      imageUrl = (input as any).pet_image;
    } else {
      throw new ValidationError("Pet image is required");
    }

    const ownerInfo = input.owner_info || {
      name: currentUser?.name || "Pet Owner",
      email: currentUser?.email || "",
    };

    const date = new Date();
    const formattedDate =
      input.posted_date ||
      `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

    return this.petsRepo.create({
      pet_name: input.pet_name,
      pet_category: input.pet_category,
      pet_age: input.pet_age,
      pet_location: input.pet_location,
      pet_description: input.pet_description,
      pet_image: imageUrl,
      posted_date: formattedDate,
      owner_info: {
        name: ownerInfo.name,
        email: ownerInfo.email,
      },
    });
  }

  async updatePet(
    id: string,
    input: UpdatePetInput,
    file?: UploadFile,
    currentUser?: CurrentUserPayload
  ): Promise<Pet> {
    const existingPet = await this.petsRepo.findById(id);
    if (!existingPet) {
      throw new NotFoundError(`Pet not found with id: ${id}`);
    }

    if (
      currentUser &&
      currentUser.role !== "admin" &&
      existingPet.owner_info.email !== currentUser.email
    ) {
      throw new ForbiddenError(
        "You are not authorized to update this pet listing"
      );
    }

    let imageUrl = existingPet.pet_image;
    if (file) {
      imageUrl = await this.mediaStorage.uploadImage(file, "pets");
    } else if (input.pet_image) {
      imageUrl = input.pet_image;
    }

    const updatedData: any = {};
    if (input.pet_name !== undefined) updatedData.pet_name = input.pet_name;
    if (input.pet_category !== undefined)
      updatedData.pet_category = input.pet_category;
    if (input.pet_age !== undefined) updatedData.pet_age = input.pet_age;
    if (input.pet_location !== undefined)
      updatedData.pet_location = input.pet_location;
    if (input.pet_description !== undefined)
      updatedData.pet_description = input.pet_description;
    if (input.posted_date !== undefined)
      updatedData.posted_date = input.posted_date;
    if (input.owner_info !== undefined)
      updatedData.owner_info = input.owner_info;
    updatedData.pet_image = imageUrl;

    return this.petsRepo.update(id, updatedData);
  }

  async deletePet(
    id: string,
    currentUser?: CurrentUserPayload
  ): Promise<Pet> {
    const existingPet = await this.petsRepo.findById(id);
    if (!existingPet) {
      throw new NotFoundError(`Pet not found with id: ${id}`);
    }

    if (
      currentUser &&
      currentUser.role !== "admin" &&
      existingPet.owner_info.email !== currentUser.email
    ) {
      throw new ForbiddenError(
        "You are not authorized to delete this pet listing"
      );
    }

    return this.petsRepo.delete(id);
  }

  async getPetsByOwner(email: string): Promise<PetWithDetails[]> {
    return this.petsRepo.findByOwnerEmail(email);
  }
}

export const petsService = new PetsService();
