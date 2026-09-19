import {
  IAdoptionsRepository,
  adoptionsRepository as defaultAdoptionsRepository,
  AdoptionRequestEnriched,
} from "./adoptions.repository";
import {
  IPetsRepository,
  petsRepository as defaultPetsRepository,
} from "../pets/pets.repository";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../core/errors/app-error";
import {
  CreateAdoptionRequestInput,
  AdoptionQuery,
} from "./adoptions.schema";
import { AdoptionRequest } from "@prisma/client";

export interface CurrentUserPayload {
  email: string;
  name?: string;
  role?: string;
}

export class AdoptionsService {
  private adoptionsRepo: IAdoptionsRepository;
  private petsRepo: IPetsRepository;

  constructor(
    adoptionsRepository?: IAdoptionsRepository,
    petsRepository?: IPetsRepository
  ) {
    this.adoptionsRepo = adoptionsRepository || defaultAdoptionsRepository;
    this.petsRepo = petsRepository || defaultPetsRepository;
  }

  async createAdoptionRequest(
    input: CreateAdoptionRequestInput,
    currentUser: CurrentUserPayload
  ): Promise<AdoptionRequest> {
    const pet = await this.petsRepo.findById(input.pet_id);
    if (!pet) {
      throw new NotFoundError(`Pet not found with id: ${input.pet_id}`);
    }

    if (pet.owner_info.email === currentUser.email) {
      throw new ValidationError(
        "You cannot submit an adoption request for your own pet"
      );
    }

    // Double adoption validation: check if pet already has an active adoption request
    const existingActiveRequest = await this.adoptionsRepo.findActiveByPetId(
      input.pet_id
    );
    if (existingActiveRequest) {
      if (existingActiveRequest.status === "adopted") {
        throw new ValidationError("This pet has already been adopted");
      }
      throw new ValidationError(
        "An adoption request is already pending for this pet"
      );
    }

    const date = new Date();
    const formattedDate =
      input.request_date ||
      `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

    const adopterName =
      input.requester_info?.name || currentUser.name || "Adopter";
    const adopterEmail =
      input.requester_info?.email || currentUser.email;
    const adopterAddress =
      input.requester_info?.address || input.address || "";
    const adopterPhone =
      input.requester_info?.phone || input.phone || "";

    return this.adoptionsRepo.create({
      pet_id: input.pet_id,
      status: "pending",
      request_date: formattedDate,
      requester_info: {
        name: adopterName,
        email: adopterEmail,
        address: adopterAddress,
        phone: adopterPhone,
      },
    });
  }

  async getAdoptionRequests(
    currentUser: CurrentUserPayload,
    query: AdoptionQuery
  ): Promise<AdoptionRequestEnriched[]> {
    const isAdmin = currentUser.role === "admin";

    if (isAdmin) {
      return this.adoptionsRepo.findAllWithPetDetails({
        status: query.status,
        petId: query.pet_id,
        ownerEmail: query.owner_email,
        adopterEmail: query.adopter_email,
      });
    }

    // If query specifies adopter email matching current user
    if (query.adopter_email && query.adopter_email === currentUser.email) {
      return this.adoptionsRepo.findAllWithPetDetails({
        status: query.status,
        petId: query.pet_id,
        adopterEmail: currentUser.email,
      });
    }

    // Otherwise, pet owner retrieving requests for their listed pets
    return this.adoptionsRepo.findAllWithPetDetails({
      status: query.status,
      petId: query.pet_id,
      ownerEmail: currentUser.email,
    });
  }

  async approveAdoption(
    requestIdOrPetId: string,
    currentUser: CurrentUserPayload
  ): Promise<AdoptionRequest> {
    // 1. Try finding by request ID first
    let request = await this.adoptionsRepo.findById(requestIdOrPetId);
    let petId = request?.pet_id;

    // 2. If not found by request ID, try finding active request by pet ID
    if (!request) {
      const activeByPet = await this.adoptionsRepo.findActiveByPetId(
        requestIdOrPetId
      );
      if (activeByPet) {
        request = activeByPet;
        petId = activeByPet.pet_id;
      }
    }

    if (!request || !petId) {
      throw new NotFoundError(
        `Adoption request not found for id: ${requestIdOrPetId}`
      );
    }

    // Check authorization: must be admin or pet owner
    const pet = await this.petsRepo.findById(petId);
    if (!pet) {
      throw new NotFoundError(`Associated pet not found for id: ${petId}`);
    }

    const isAdmin = currentUser.role === "admin";
    const isOwner = pet.owner_info.email === currentUser.email;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenError(
        "You are not authorized to approve adoption requests for this pet"
      );
    }

    return this.adoptionsRepo.updateStatus(request.id, "adopted");
  }
}

export const adoptionsService = new AdoptionsService();
