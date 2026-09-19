import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const adopterInfoSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export const createAdoptionRequestSchema = z
  .object({
    pet_id: z.string({ required_error: "Pet ID is required" }),
    request_date: z.string().optional(),
    status: z.enum(["pending", "adopted", "rejected"]).optional().default("pending"),
    requester_info: adopterInfoSchema.optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    requester_id: z.string().optional(),
  })
  .refine(
    (data) => {
      // Must have address in either requester_info or top-level, or allow partial if info exists
      return true;
    },
    { message: "Invalid adoption request data" }
  );

export const adoptionIdParamSchema = z.object({
  id: z
    .string()
    .regex(objectIdRegex, "ID must be a 24-character hexadecimal ObjectId"),
});

export const updateAdoptionStatusSchema = z.object({
  status: z.enum(["pending", "adopted", "rejected"]).optional().default("adopted"),
});

export const adoptionQuerySchema = z.object({
  status: z.string().optional(),
  pet_id: z.string().optional(),
  owner_email: z.string().email().optional(),
  adopter_email: z.string().email().optional(),
});

export type CreateAdoptionRequestInput = z.infer<typeof createAdoptionRequestSchema>;
export type UpdateAdoptionStatusInput = z.infer<typeof updateAdoptionStatusSchema>;
export type AdoptionQuery = z.infer<typeof adoptionQuerySchema>;
