import { Router } from "express";
import { AuthController, authController as defaultAuthController } from "./auth.controller";

export function createAuthRouter(controller: AuthController = defaultAuthController): Router {
  const router = Router();

  // POST /jwt or POST / (when mounted at /api/v1/auth/jwt)
  router.post("/jwt", controller.createToken);
  router.post("/", controller.createToken);

  return router;
}

export const authRouter = createAuthRouter();
