import { prisma as defaultPrisma } from "../../core/db/prisma";
import { PrismaClient, Pet, Prisma } from "@prisma/client";

export interface PetRequestDetails {
  status: string;
  request_date?: string;
  requester_info?: {
    name: string;
    email: string;
    address?: string | null;
    phone?: string | null;
  };
}

export type PetWithDetails = Pet & {
  requestDetails: PetRequestDetails | null;
};

export interface AvailablePetsResult {
  pets: Pet[];
  totalPages: number;
  currentPage: number;
  totalPets: number;
}

export interface IPetsRepository {
  findAvailablePets(options: {
    category?: string;
    page: number;
    limit: number;
  }): Promise<AvailablePetsResult>;
  findById(id: string): Promise<Pet | null>;
  findByIdWithDetails(id: string): Promise<PetWithDetails | null>;
  create(data: Prisma.PetCreateInput): Promise<Pet>;
  update(id: string, data: Prisma.PetUpdateInput): Promise<Pet>;
  delete(id: string): Promise<Pet>;
  findByOwnerEmail(email: string): Promise<PetWithDetails[]>;
}

export class PetsRepository implements IPetsRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  async findAvailablePets(options: {
    category?: string;
    page: number;
    limit: number;
  }): Promise<AvailablePetsResult> {
    const { category, page, limit } = options;
    const skip = (page - 1) * limit;

    // Find pet IDs that currently have adoption requests
    const activeRequests = await this.prisma.adoptionRequest.findMany({
      select: { pet_id: true },
    });
    const requestedPetIds = activeRequests.map((r) => r.pet_id);

    const where: Prisma.PetWhereInput = {};

    if (category && category.toLowerCase() !== "all") {
      where.pet_category = {
        equals: category,
        mode: "insensitive",
      };
    }

    if (requestedPetIds.length > 0) {
      where.id = {
        notIn: requestedPetIds,
      };
    }

    const [pets, totalPets] = await Promise.all([
      this.prisma.pet.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.pet.count({ where }),
    ]);

    const totalPages = Math.ceil(totalPets / limit) || (totalPets > 0 ? 1 : 0);

    return {
      pets,
      totalPages,
      currentPage: page,
      totalPets,
    };
  }

  async findById(id: string): Promise<Pet | null> {
    return this.prisma.pet.findUnique({
      where: { id },
    });
  }

  async findByIdWithDetails(id: string): Promise<PetWithDetails | null> {
    const pet = await this.prisma.pet.findUnique({
      where: { id },
    });

    if (!pet) {
      return null;
    }

    const request = await this.prisma.adoptionRequest.findFirst({
      where: { pet_id: id },
      orderBy: { createdAt: "desc" },
    });

    return {
      ...pet,
      requestDetails: request
        ? {
            status: request.status,
            request_date: request.request_date,
            requester_info: request.requester_info,
          }
        : null,
    };
  }

  async create(data: Prisma.PetCreateInput): Promise<Pet> {
    return this.prisma.pet.create({
      data,
    });
  }

  async update(id: string, data: Prisma.PetUpdateInput): Promise<Pet> {
    return this.prisma.pet.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Pet> {
    return this.prisma.pet.delete({
      where: { id },
    });
  }

  async findByOwnerEmail(email: string): Promise<PetWithDetails[]> {
    const pets = await this.prisma.pet.findMany({
      where: {
        owner_info: {
          is: {
            email,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (pets.length === 0) {
      return [];
    }

    const petIds = pets.map((p) => p.id);
    const requests = await this.prisma.adoptionRequest.findMany({
      where: {
        pet_id: { in: petIds },
      },
      orderBy: { createdAt: "desc" },
    });

    const requestsMap = new Map<string, PetRequestDetails>();
    for (const req of requests) {
      if (!requestsMap.has(req.pet_id)) {
        requestsMap.set(req.pet_id, {
          status: req.status,
          request_date: req.request_date,
          requester_info: req.requester_info,
        });
      }
    }

    return pets.map((pet) => ({
      ...pet,
      requestDetails: requestsMap.get(pet.id) || null,
    }));
  }
}

export const petsRepository = new PetsRepository();
