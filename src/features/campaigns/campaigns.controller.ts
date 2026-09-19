import { Request, Response, NextFunction } from "express";
import {
  CampaignsService,
  campaignsService as defaultCampaignsService,
} from "./campaigns.service";
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignIdParamSchema,
  campaignQuerySchema,
} from "./campaigns.schema";
import { ValidationError } from "../../core/errors/app-error";

export class CampaignsController {
  private service: CampaignsService;

  constructor(service?: CampaignsService) {
    this.service = service || defaultCampaignsService;
  }

  getPaginatedCampaigns = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = campaignQuerySchema.parse(req.query);
      const result = await this.service.getPaginatedCampaigns(query);

      const campaignsWithCompatId = result.campaigns.map((c) => ({
        ...c,
        _id: c.id,
      }));

      res.status(200).json({
        campaigns: campaignsWithCompatId,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        totalCampaigns: result.totalCampaigns,
      });
    } catch (error) {
      next(error);
    }
  };

  getCampaignById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = campaignIdParamSchema.parse(req.params);
      const campaign = await this.service.getCampaignById(id);

      res.status(200).json({
        ...campaign,
        _id: campaign.id,
      });
    } catch (error) {
      next(error);
    }
  };

  createCampaign = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const body = createCampaignSchema.parse(req.body);
      const campaign = await this.service.createCampaign(
        body,
        req.file,
        req.user
      );

      res.status(201).json({
        acknowledged: true,
        insertedId: campaign.id,
        campaign: {
          ...campaign,
          _id: campaign.id,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  updateCampaign = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = campaignIdParamSchema.parse(req.params);
      const body = updateCampaignSchema.parse(req.body);
      const updatedCampaign = await this.service.updateCampaign(
        id,
        body,
        req.file,
        req.user
      );

      res.status(200).json({
        acknowledged: true,
        modifiedCount: 1,
        campaign: {
          ...updatedCampaign,
          _id: updatedCampaign.id,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  deleteCampaign = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = campaignIdParamSchema.parse(req.params);
      await this.service.deleteCampaign(id, req.user);

      res.status(200).json({
        acknowledged: true,
        deletedCount: 1,
      });
    } catch (error) {
      next(error);
    }
  };

  getMyCampaigns = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const email =
        req.user?.email || (req.query.email as string | undefined);

      if (!email) {
        throw new ValidationError("Creator email is required");
      }

      const campaigns = await this.service.getCampaignsByCreator(email);
      const campaignsWithCompatId = campaigns.map((c) => ({
        ...c,
        _id: c.id,
      }));

      res.status(200).json(campaignsWithCompatId);
    } catch (error) {
      next(error);
    }
  };

  getAllCampaignsAdmin = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const campaigns = await this.service.getAllCampaignsForAdmin();
      const campaignsWithCompatId = campaigns.map((c) => ({
        ...c,
        _id: c.id,
      }));

      res.status(200).json(campaignsWithCompatId);
    } catch (error) {
      next(error);
    }
  };
}

export const campaignsController = new CampaignsController();
