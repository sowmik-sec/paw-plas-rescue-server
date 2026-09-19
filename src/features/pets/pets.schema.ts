import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const petIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, "Invalid pet id format"),
});

export const petQuerySchema = z.object({
  category: z.string().optional().default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const ownerInfoSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}, z.object({
  name: z.string().min(1, "Owner name is required"),
  email: z.string().email("Invalid owner email"),
}));

export const createPetSchema = z.object({
  pet_name: z.string().min(1, "Pet name is required"),
  pet_category: z.string().min(1, "Pet category is required"),
  pet_age: z.string().min(1, "Pet age is required"),
  pet_location: z.string().min(1, "Pet location is required"),
  pet_description: z.string().min(1, "Pet description is required"),
  posted_date: z.string().optional(),
  owner_info: ownerInfoSchema.optional(),
});

export const updatePetSchema = z.object({
  pet_name: z.string().min(1).optional(),
  pet_category: z.string().min(1).optional(),
  pet_age: z.string().min(1).optional(),
  pet_location: z.string().min(1).optional(),
  pet_description: z.string().min(1).optional(),
  posted_date: z.string().optional(),
  owner_info: ownerInfoSchema.optional(),
  pet_image: z.string().optional(),
});

export type PetIdParam = z.infer<typeof petIdParamSchema>;
export type PetQuery = z.infer<typeof petQuerySchema>;
export type OwnerInfoInput = z.infer<typeof ownerInfoSchema>;
export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
