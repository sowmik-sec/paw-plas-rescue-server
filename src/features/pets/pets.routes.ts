import { Router, RequestHandler } from "express";
import multer from "multer";
import { petsController, PetsController } from "./pets.controller";
import { authenticate as defaultAuthenticate } from "../../core/middleware/auth";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export interface PetsRouterOptions {
  controller?: PetsController;
  authenticateMiddleware?: RequestHandler;
}

export function createPetsRouter(options?: PetsRouterOptions): Router {
  const router = Router();
  const controller = options?.controller || petsController;
  const authenticate = options?.authenticateMiddleware || defaultAuthenticate;

  // 1. Static and specific subpaths must be registered BEFORE parameterized "/:id"
  router.get("/", controller.getAvailablePets);
  router.get("/owner/me", authenticate, controller.getOwnerPets);
  router.get("/:id", controller.getPetById);

  // Authenticated CRUD endpoints
  router.post(
    "/",
    authenticate,
    upload.single("pet_image"),
    controller.createPet
  );

  router.put(
    "/:id",
    authenticate,
    upload.single("pet_image"),
    controller.updatePet
  );

  router.delete("/:id", authenticate, controller.deletePet);

  return router;
}

export function createLegacyPetsRouter(options?: PetsRouterOptions): Router {
  const router = Router();
  const controller = options?.controller || petsController;
  const authenticate = options?.authenticateMiddleware || defaultAuthenticate;

  router.get("/pets", controller.getAvailablePets);
  router.get("/pets/details/:id", controller.getPetById);
  router.post(
    "/add-pet",
    authenticate,
    upload.single("pet_image"),
    controller.createPet
  );
  router.put(
    "/update-pet/:id",
    authenticate,
    upload.single("pet_image"),
    controller.updatePet
  );
  router.delete("/delete-pet/:id", authenticate, controller.deletePet);
  router.get("/my-pets", authenticate, controller.getOwnerPets);

  return router;
}

export const petsRouter = createPetsRouter();
export const legacyPetsRouter = createLegacyPetsRouter();
