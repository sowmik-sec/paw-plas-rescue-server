import { Request, Response, NextFunction } from "express";
import { UsersService, usersService as defaultUsersService } from "./users.service";
import {
  createUserSchema,
  adminEmailParamSchema,
  userIdParamSchema,
} from "./users.schema";
import { User } from "@prisma/client";

function serializeUser(user: User): User & { _id: string } {
  return {
    ...user,
    _id: user.id,
  };
}

export class UsersController {
  private usersService: UsersService;

  constructor(usersSvc?: UsersService) {
    this.usersService = usersSvc || defaultUsersService;
  }

  public register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = createUserSchema.parse(req.body);
      const result = await this.usersService.registerUser(validated);

      res.status(result.isNew ? 201 : 200).json({
        success: true,
        message: result.message,
        insertedId: result.insertedId,
        user: serializeUser(result.user),
      });
    } catch (error) {
      next(error);
    }
  };

  public checkAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = adminEmailParamSchema.parse(req.params);
      const requesterEmail = req.user?.email || "";
      const result = await this.usersService.checkAdminStatus(
        validated.email,
        requesterEmail
      );

      res.status(200).json({
        success: true,
        admin: result.admin,
      });
    } catch (error) {
      next(error);
    }
  };

  public getAll = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const users = await this.usersService.getAllUsers();
      const serialized = users.map(serializeUser);
      res.status(200).json(serialized);
    } catch (error) {
      next(error);
    }
  };

  public promoteToAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = userIdParamSchema.parse(req.params);
      const result = await this.usersService.promoteToAdmin(validated.id);

      res.status(200).json({
        success: true,
        modifiedCount: result.modifiedCount,
        user: serializeUser(result.user),
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = userIdParamSchema.parse(req.params);
      const result = await this.usersService.deleteUser(validated.id);

      res.status(200).json({
        success: true,
        deletedCount: result.deletedCount,
        user: serializeUser(result.user),
      });
    } catch (error) {
      next(error);
    }
  };
}

export const usersController = new UsersController();
