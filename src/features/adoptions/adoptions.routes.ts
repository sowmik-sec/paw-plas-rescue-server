import { Router, RequestHandler } from "express";
import {
  adoptionsController,
  AdoptionsController,
} from "./adoptions.controller";
import { authenticate as defaultAuthenticate } from "../../core/middleware/auth";

export interface AdoptionsRouterOptions {
  controller?: AdoptionsController;
  authenticateMiddleware?: RequestHandler;
}

export function createAdoptionsRouter(
  options?: AdoptionsRouterOptions
): Router {
  const router = Router();
  const controller = options?.controller || adoptionsController;
  const authenticate = options?.authenticateMiddleware || defaultAuthenticate;

  router.post("/", authenticate, controller.createAdoptionRequest);
  router.get("/", authenticate, controller.getAdoptionRequests);
  router.patch("/:id/approve", authenticate, controller.approveAdoption);
  router.patch("/:id", authenticate, controller.approveAdoption);

  return router;
}

export function createLegacyAdoptionsRouter(
  options?: AdoptionsRouterOptions
): Router {
  const router = Router();
  const controller = options?.controller || adoptionsController;
  const authenticate = options?.authenticateMiddleware || defaultAuthenticate;

  router.post("/pet-request", authenticate, controller.createAdoptionRequest);
  router.get("/adoption-requests", authenticate, controller.getAdoptionRequests);
  router.patch("/make-adopted/:id", authenticate, controller.approveAdoption);

  return router;
}

export const adoptionsRouter = createAdoptionsRouter();
export const legacyAdoptionsRouter = createLegacyAdoptionsRouter();
