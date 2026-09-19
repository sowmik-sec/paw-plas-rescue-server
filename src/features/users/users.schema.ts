import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("A valid email address is required"),
  image: z.string().optional().nullable(),
  role: z.string().optional(),
  uid: z.string().optional(),
});

export const adminEmailParamSchema = z.object({
  email: z.string().email("A valid email address is required"),
});

export const userIdParamSchema = z.object({
  id: z.string().min(1, "User ID is required"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type AdminEmailParamInput = z.infer<typeof adminEmailParamSchema>;
export type UserIdParamInput = z.infer<typeof userIdParamSchema>;
