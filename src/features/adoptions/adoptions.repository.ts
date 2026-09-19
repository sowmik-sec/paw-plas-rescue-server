import { prisma as defaultPrisma } from "../../core/db/prisma";
import { PrismaClient, AdoptionRequest, Pet, Prisma } from "@prisma/client";

export interface AdoptionRequestEnriched extends AdoptionRequest {
  pet_name?: string;
  pet_category?: string;
  pet_age?: string;
  pet_location?: string;
  pet_image?: string;
  pet_description?: string;
  owner_info?: {
    name: string;
    email: string;
  };
}

export interface IAdoptionsRepository {
  create(data: Prisma.AdoptionRequestCreateInput): Promise<AdoptionRequest>;
  findById(id: string): Promise<AdoptionRequest | null>;
  findByPetId(petId: string): Promise<AdoptionRequest[]>;
  findActiveByPetId(petId: string): Promise<AdoptionRequest | null>;
  findAll(filter?: {
    status?: string;
    petIds?: string[];
    adopterEmail?: string;
  }): Promise<AdoptionRequest[]>;
  findAllWithPetDetails(filter?: {
    status?: string;
    ownerEmail?: string;
    adopterEmail?: string;
    petId?: string;
  }): Promise<AdoptionRequestEnriched[]>;
  updateStatus(id: string, status: string): Promise<AdoptionRequest>;
  updateStatusByPetId(petId: string, status: string): Promise<AdoptionRequest | null>;
}

export class AdoptionsRepository implements IAdoptionsRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  async create(data: Prisma.AdoptionRequestCreateInput): Promise<AdoptionRequest> {
    return this.prisma.adoptionRequest.create({
      data,
    });
  }

  async findById(id: string): Promise<AdoptionRequest | null> {
    return this.prisma.adoptionRequest.findUnique({
      where: { id },
    });
  }

  async findByPetId(petId: string): Promise<AdoptionRequest[]> {
    return this.prisma.adoptionRequest.findMany({
      where: { pet_id: petId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findActiveByPetId(petId: string): Promise<AdoptionRequest | null> {
    return this.prisma.adoptionRequest.findFirst({
      where: {
        pet_id: petId,
        status: { in: ["pending", "adopted"] },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAll(filter?: {
    status?: string;
    petIds?: string[];
    adopterEmail?: string;
  }): Promise<AdoptionRequest[]> {
    const where: Prisma.AdoptionRequestWhereInput = {};

    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.petIds && filter.petIds.length > 0) {
      where.pet_id = { in: filter.petIds };
    }
    if (filter?.adopterEmail) {
      where.requester_info = {
        is: {
          email: filter.adopterEmail,
        },
      };
    }

    return this.prisma.adoptionRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async findAllWithPetDetails(filter?: {
    status?: string;
    ownerEmail?: string;
    adopterEmail?: string;
    petId?: string;
  }): Promise<AdoptionRequestEnriched[]> {
    let petIds: string[] | undefined;
    let petsMap = new Map<string, Pet>();

    if (filter?.ownerEmail) {
      const ownerPets = await this.prisma.pet.findMany({
        where: {
          owner_info: {
            is: {
              email: filter.ownerEmail,
            },
          },
        },
      });
      petIds = ownerPets.map((p) => p.id);
      ownerPets.forEach((p) => petsMap.set(p.id, p));

      if (petIds.length === 0) {
        return [];
      }
    }

    const where: Prisma.AdoptionRequestWhereInput = {};

    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.petId) {
      where.pet_id = filter.petId;
    } else if (petIds) {
      where.pet_id = { in: petIds };
    }
    if (filter?.adopterEmail) {
      where.requester_info = {
        is: {
          email: filter.adopterEmail,
        },
      };
    }

    const requests = await this.prisma.adoptionRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (requests.length === 0) {
      return [];
    }

    // If we haven't fetched all pets yet, fetch them for the requests
    const missingPetIds = requests
      .map((r) => r.pet_id)
      .filter((id) => !petsMap.has(id));

    if (missingPetIds.length > 0) {
      const fetchedPets = await this.prisma.pet.findMany({
        where: {
          id: { in: missingPetIds },
        },
      });
      fetchedPets.forEach((p) => petsMap.set(p.id, p));
    }

    return requests.map((req) => {
      const pet = petsMap.get(req.pet_id);
      return {
        ...req,
        pet_name: pet?.pet_name,
        pet_category: pet?.pet_category,
        pet_age: pet?.pet_age,
        pet_location: pet?.pet_location,
        pet_image: pet?.pet_image,
        pet_description: pet?.pet_description,
        owner_info: pet?.owner_info,
      };
    });
  }

  async updateStatus(id: string, status: string): Promise<AdoptionRequest> {
    return this.prisma.adoptionRequest.update({
      where: { id },
      data: { status },
    });
  }

  async updateStatusByPetId(
    petId: string,
    status: string
  ): Promise<AdoptionRequest | null> {
    const existing = await this.prisma.adoptionRequest.findFirst({
      where: { pet_id: petId },
      orderBy: { createdAt: "desc" },
    });

    if (!existing) {
      return null;
    }

    return this.prisma.adoptionRequest.update({
      where: { id: existing.id },
      data: { status },
    });
  }
}

export const adoptionsRepository = new AdoptionsRepository();
