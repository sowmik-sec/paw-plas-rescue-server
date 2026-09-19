import { Router, RequestHandler } from "express";
import {
  UsersController,
  usersController as defaultUsersController,
} from "./users.controller";
import {
  authenticate as defaultAuthenticate,
  requireAdmin as defaultRequireAdmin,
} from "../auth/auth.middleware";

export interface UsersRouterOptions {
  controller?: UsersController;
  authenticateMiddleware?: RequestHandler;
  requireAdminMiddleware?: RequestHandler;
}

export function createUsersRouter(options: UsersRouterOptions = {}): Router {
  const router = Router();
  const controller = options.controller || defaultUsersController;
  const auth = options.authenticateMiddleware || defaultAuthenticate;
  const admin = options.requireAdminMiddleware || defaultRequireAdmin;

  // Public registration endpoint
  router.post("/", controller.register);

  // Authenticated admin verification endpoint
  router.get("/admin/:email", auth, controller.checkAdmin);

  // Admin-only: list all accounts
  router.get("/", auth, admin, controller.getAll);

  // Admin-only: promote user to admin
  router.patch("/admin/:id", auth, admin, controller.promoteToAdmin);
  router.patch("/:id/role", auth, admin, controller.promoteToAdmin);

  // Admin-only: delete user
  router.delete("/:id", auth, admin, controller.deleteUser);

  return router;
}

export const usersRouter = createUsersRouter();
