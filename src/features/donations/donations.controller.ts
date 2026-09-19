import { Request, Response, NextFunction } from "express";
import {
  donationsService as defaultDonationsService,
  DonationsService,
} from "./donations.service";
import {
  createPaymentIntentSchema,
  createDonationSchema,
  campaignTotalParamSchema,
  legacyPetIdParamSchema,
} from "./donations.schema";
import { ValidationError } from "../../core/errors/app-error";

export class DonationsController {
  private service: DonationsService;

  constructor(service?: DonationsService) {
    this.service = service || defaultDonationsService;
  }

  createPaymentIntent = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const parsedBody = createPaymentIntentSchema.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ValidationError(
          parsedBody.error.errors.map((e) => e.message).join(", ")
        );
      }

      const result = await this.service.createPaymentIntent(
        parsedBody.data.donation,
        req.user?.email
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  recordDonation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const parsedBody = createDonationSchema.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ValidationError(
          parsedBody.error.errors.map((e) => e.message).join(", ")
        );
      }

      const result = await this.service.recordDonation(
        parsedBody.data,
        req.user
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  getMyDonations = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const email =
        req.user?.email || (typeof req.query.email === "string" ? req.query.email : undefined);

      if (!email) {
        throw new ValidationError("User email is required to view donation history");
      }

      const result = await this.service.getDonorDonations(email);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getCampaignTotal = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      let campaignId: string | undefined = req.params.campaignId;

      if (!campaignId && req.params.petId) {
        const parsedLegacyParam = legacyPetIdParamSchema.safeParse(req.params);
        if (!parsedLegacyParam.success) {
          throw new ValidationError("Invalid campaign ID format");
        }
        campaignId = parsedLegacyParam.data.petId;
      } else {
        const parsedParam = campaignTotalParamSchema.safeParse(req.params);
        if (!parsedParam.success) {
          throw new ValidationError("Invalid campaign ID format");
        }
        campaignId = parsedParam.data.campaignId;
      }

      const result = await this.service.getCampaignTotal(campaignId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getAllDonationsAdmin = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.service.getAllDonationsForAdmin();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const donationsController = new DonationsController();
