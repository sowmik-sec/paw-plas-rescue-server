import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const campaignIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, "Invalid campaign id format"),
});

export const campaignQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const creatorInfoSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}, z.object({
  name: z.string().min(1, "Creator name is required"),
  email: z.string().email("Invalid creator email"),
}));

export const createCampaignSchema = z.object({
  pet_name: z.string().min(1, "Pet name is required"),
  max_donation: z.coerce.number().positive("Max donation must be greater than zero"),
  last_date: z.string().min(1, "Last date is required"),
  short_description: z.string().min(1, "Short description is required"),
  long_description: z.string().optional(),
  pet_image: z.string().optional(),
  donation_created_at: z.string().optional(),
  creator_info: creatorInfoSchema.optional(),
});

export const updateCampaignSchema = z.object({
  pet_name: z.string().min(1).optional(),
  max_donation: z.coerce.number().positive().optional(),
  last_date: z.string().min(1).optional(),
  short_description: z.string().min(1).optional(),
  long_description: z.string().optional(),
  pet_image: z.string().optional(),
  donation_created_at: z.string().optional(),
  creator_info: creatorInfoSchema.optional(),
});

export type CampaignIdParam = z.infer<typeof campaignIdParamSchema>;
export type CampaignQuery = z.infer<typeof campaignQuerySchema>;
export type CreatorInfoInput = z.infer<typeof creatorInfoSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
