import { prisma as defaultPrisma } from "../../core/db/prisma";
import { PrismaClient, User } from "@prisma/client";

export interface CreateUserData {
  name: string;
  email: string;
  image?: string | null;
  role?: string;
}

export interface IUsersRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  findAll(): Promise<User[]>;
  updateRole(id: string, role: string): Promise<User>;
  deleteById(id: string): Promise<User>;
}

export class UsersRepository implements IUsersRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        image: data.image || null,
        role: data.role || "user",
      },
    });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async updateRole(id: string, role: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  async deleteById(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}

export const usersRepository = new UsersRepository();
