import { Request, Response, NextFunction } from "express";
import {
  AdoptionsService,
  adoptionsService as defaultAdoptionsService,
} from "./adoptions.service";
import {
  createAdoptionRequestSchema,
  adoptionIdParamSchema,
  adoptionQuerySchema,
} from "./adoptions.schema";
import { UnauthorizedError } from "../../core/errors/app-error";

export class AdoptionsController {
  private service: AdoptionsService;

  constructor(service?: AdoptionsService) {
    this.service = service || defaultAdoptionsService;
  }

  createAdoptionRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }

      const body = createAdoptionRequestSchema.parse(req.body);
      const request = await this.service.createAdoptionRequest(body, req.user);

      res.status(201).json({
        acknowledged: true,
        insertedId: request.id,
        adoptionRequest: {
          ...request,
          _id: request.id,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getAdoptionRequests = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }

      const query = adoptionQuerySchema.parse(req.query);
      const requests = await this.service.getAdoptionRequests(req.user, query);

      // Map to include backwards-compatible fields for dashboard and TanStack queries
      const formatted = requests.map((req) => ({
        ...req,
        _id: req.pet_id || req.id,
        petRequests: [{ status: req.status }],
      }));

      res.status(200).json(formatted);
    } catch (error) {
      next(error);
    }
  };

  approveAdoption = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }

      const { id } = adoptionIdParamSchema.parse(req.params);
      const updated = await this.service.approveAdoption(id, req.user);

      res.status(200).json({
        acknowledged: true,
        modifiedCount: 1,
        adoptionRequest: {
          ...updated,
          _id: updated.id,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const adoptionsController = new AdoptionsController();
