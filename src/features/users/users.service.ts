import {
  IUsersRepository,
  usersRepository as defaultUsersRepository,
} from "./users.repository";
import { ForbiddenError, NotFoundError } from "../../core/errors/app-error";
import { User } from "@prisma/client";

export interface RegisterUserInput {
  name: string;
  email: string;
  image?: string | null;
  role?: string;
}

export interface RegisterUserResult {
  isNew: boolean;
  message: string;
  insertedId: string | null;
  user: User;
}

export interface CheckAdminResult {
  admin: boolean;
}

export interface ModifyUserResult {
  modifiedCount: number;
  user: User;
}

export interface DeleteUserResult {
  deletedCount: number;
  user: User;
}

export class UsersService {
  private usersRepo: IUsersRepository;

  constructor(usersRepository?: IUsersRepository) {
    this.usersRepo = usersRepository || defaultUsersRepository;
  }

  async registerUser(data: RegisterUserInput): Promise<RegisterUserResult> {
    const existingUser = await this.usersRepo.findByEmail(data.email);
    if (existingUser) {
      return {
        isNew: false,
        message: "User already exists",
        insertedId: null,
        user: existingUser,
      };
    }

    const newUser = await this.usersRepo.create({
      name: data.name,
      email: data.email,
      image: data.image || null,
      role: "user", // Registration defaults to user role
    });

    return {
      isNew: true,
      message: "User created successfully",
      insertedId: newUser.id,
      user: newUser,
    };
  }

  async checkAdminStatus(
    targetEmail: string,
    requesterEmail: string
  ): Promise<CheckAdminResult> {
    if (targetEmail !== requesterEmail) {
      throw new ForbiddenError("Forbidden access");
    }

    const user = await this.usersRepo.findByEmail(targetEmail);
    const isAdmin = user?.role === "admin";
    return { admin: !!isAdmin };
  }

  async getAllUsers(): Promise<User[]> {
    return this.usersRepo.findAll();
  }

  async promoteToAdmin(id: string): Promise<ModifyUserResult> {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundError(`User not found with id: ${id}`);
    }

    const updatedUser = await this.usersRepo.updateRole(id, "admin");
    return {
      modifiedCount: 1,
      user: updatedUser,
    };
  }

  async deleteUser(id: string): Promise<DeleteUserResult> {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new NotFoundError(`User not found with id: ${id}`);
    }

    const deletedUser = await this.usersRepo.deleteById(id);
    return {
      deletedCount: 1,
      user: deletedUser,
    };
  }
}

export const usersService = new UsersService();
