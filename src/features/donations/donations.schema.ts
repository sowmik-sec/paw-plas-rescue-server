import { z } from "zod";

export const createPaymentIntentSchema = z.object({
  donation: z.coerce
    .number({
      required_error: "Donation amount is required",
      invalid_type_error: "Donation amount must be a valid number",
    })
    .positive("Donation amount must be greater than 0"),
});

export type CreatePaymentIntentInput = z.infer<
  typeof createPaymentIntentSchema
>;

export const createDonationSchema = z.object({
  pet_id: z
    .string({
      required_error: "Campaign ID (pet_id) is required",
    })
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid campaign ID format"),
  donation: z.coerce
    .number({
      required_error: "Donation amount is required",
      invalid_type_error: "Donation amount must be a number",
    })
    .positive("Donation amount must be greater than 0"),
  email: z.string().email("Invalid email address").optional(),
  transactionId: z.string().optional(),
  date: z.string().optional(),
  status: z.string().optional(),
});

export type CreateDonationInput = z.infer<typeof createDonationSchema>;

export const campaignTotalParamSchema = z.object({
  campaignId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid campaign ID format"),
});

export const legacyPetIdParamSchema = z.object({
  petId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid campaign ID format"),
});

export const donorHistoryQuerySchema = z.object({
  email: z.string().email("Invalid email format").optional(),
});
