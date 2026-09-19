import { Request, Response, NextFunction } from "express";
import { AuthService, authService as defaultAuthService } from "./auth.service";
import { jwtRequestSchema } from "./auth.schema";

export class AuthController {
  private authService: AuthService;

  constructor(authSvc?: AuthService) {
    this.authService = authSvc || defaultAuthService;
  }

  public createToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = jwtRequestSchema.parse(req.body);
      const token = this.authService.generateToken({ email: validated.email });
      res.status(200).json({
        success: true,
        token,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
