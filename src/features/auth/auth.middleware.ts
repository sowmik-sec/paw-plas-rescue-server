import { Request, Response, NextFunction } from "express";
import { AuthService, authService as defaultAuthService } from "./auth.service";
import {
  IUsersRepository,
  usersRepository as defaultUsersRepository,
} from "../users/users.repository";
import { UnauthorizedError, ForbiddenError } from "../../core/errors/app-error";

export function createAuthenticateMiddleware(authSvc: AuthService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedError("Unauthorized access");
      }

      const parts = authHeader.split(" ");
      if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
        throw new UnauthorizedError("Unauthorized access");
      }

      const token = parts[1];
      const decoded = authSvc.verifyToken(token);
      req.user = decoded;
      req.decoded = decoded;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function createRequireAdminMiddleware(usersRepo: IUsersRepository) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.email) {
        throw new UnauthorizedError("Unauthorized access");
      }

      const user = await usersRepo.findByEmail(req.user.email);
      if (!user || user.role !== "admin") {
        throw new ForbiddenError("Forbidden access");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export const authenticate = createAuthenticateMiddleware(defaultAuthService);
export const requireAdmin = createRequireAdminMiddleware(defaultUsersRepository);

// Legacy aliases for backward compatibility
export const verifyToken = authenticate;
export const verifyAdmin = requireAdmin;
