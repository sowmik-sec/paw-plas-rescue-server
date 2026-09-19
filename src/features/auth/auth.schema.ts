import { z } from "zod";

export const jwtRequestSchema = z.object({
  email: z.string().email("A valid email address is required"),
});

export type JwtRequestInput = z.infer<typeof jwtRequestSchema>;
