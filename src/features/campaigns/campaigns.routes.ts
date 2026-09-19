import { Router, RequestHandler } from "express";
import multer from "multer";
import {
  campaignsController,
  CampaignsController,
} from "./campaigns.controller";
import {
  authenticate as defaultAuthenticate,
  requireAdmin as defaultRequireAdmin,
} from "../../core/middleware/auth";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export interface CampaignsRouterOptions {
  controller?: CampaignsController;
  authenticateMiddleware?: RequestHandler;
  requireAdminMiddleware?: RequestHandler;
}

export function createCampaignsRouter(
  options?: CampaignsRouterOptions
): Router {
  const router = Router();
  const controller = options?.controller || campaignsController;
  const authenticate = options?.authenticateMiddleware || defaultAuthenticate;
  const requireAdmin = options?.requireAdminMiddleware || defaultRequireAdmin;

  // 1. Static and specific subpaths registered BEFORE parameterized "/:id"
  router.get("/", controller.getPaginatedCampaigns);
  router.get("/creator/me", authenticate, controller.getMyCampaigns);
  router.get(
    "/admin/all",
    authenticate,
    requireAdmin,
    controller.getAllCampaignsAdmin
  );
  router.get("/:id", controller.getCampaignById);

  // Authenticated CRUD endpoints
  router.post(
    "/",
    authenticate,
    upload.single("pet_image"),
    controller.createCampaign
  );

  router.put(
    "/:id",
    authenticate,
    upload.single("pet_image"),
    controller.updateCampaign
  );

  router.delete("/:id", authenticate, controller.deleteCampaign);

  return router;
}

export function createLegacyCampaignsRouter(
  options?: CampaignsRouterOptions
): Router {
  const router = Router();
  const controller = options?.controller || campaignsController;
  const authenticate = options?.authenticateMiddleware || defaultAuthenticate;
  const requireAdmin = options?.requireAdminMiddleware || defaultRequireAdmin;

  router.get("/donation-campaigns", controller.getPaginatedCampaigns);
  router.get(
    "/all-donation-campaigns",
    authenticate,
    requireAdmin,
    controller.getAllCampaignsAdmin
  );
  router.get("/donation-campaign/:id", controller.getCampaignById);
  router.get("/my-donation-campaigns", authenticate, controller.getMyCampaigns);
  router.post(
    "/create-donation-campaign",
    authenticate,
    upload.single("pet_image"),
    controller.createCampaign
  );

  return router;
}

export const campaignsRouter = createCampaignsRouter();
export const legacyCampaignsRouter = createLegacyCampaignsRouter();
