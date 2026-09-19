import { Router, RequestHandler } from "express";
import {
  donationsController,
  DonationsController,
} from "./donations.controller";
import {
  authenticate as defaultAuthenticate,
  requireAdmin as defaultRequireAdmin,
} from "../../core/middleware/auth";

export interface DonationsRouterOptions {
  controller?: DonationsController;
  authenticateMiddleware?: RequestHandler;
  requireAdminMiddleware?: RequestHandler;
}

export function createDonationsRouter(
  options?: DonationsRouterOptions
): Router {
  const router = Router();
  const controller = options?.controller || donationsController;
  const authenticate = options?.authenticateMiddleware || defaultAuthenticate;
  const requireAdmin = options?.requireAdminMiddleware || defaultRequireAdmin;

  // Specific / static subpaths
  router.post("/payment-intent", authenticate, controller.createPaymentIntent);
  router.post("/", authenticate, controller.recordDonation);
  router.get("/user/me", authenticate, controller.getMyDonations);
  router.get("/admin/all", authenticate, requireAdmin, controller.getAllDonationsAdmin);
  router.get("/campaign/:campaignId/total", authenticate, controller.getCampaignTotal);

  return router;
}

export function createLegacyDonationsRouter(
  options?: DonationsRouterOptions
): Router {
  const router = Router();
  const controller = options?.controller || donationsController;
  const authenticate = options?.authenticateMiddleware || defaultAuthenticate;
  const requireAdmin = options?.requireAdminMiddleware || defaultRequireAdmin;

  router.post("/create-donation-intent", authenticate, controller.createPaymentIntent);
  router.post("/donations", authenticate, controller.recordDonation);
  router.get("/my-donations", authenticate, controller.getMyDonations);
  router.get("/donations/total/:petId", authenticate, controller.getCampaignTotal);
  router.get("/all-donations", authenticate, requireAdmin, controller.getAllDonationsAdmin);

  return router;
}

export const donationsRouter = createDonationsRouter();
export const legacyDonationsRouter = createLegacyDonationsRouter();
