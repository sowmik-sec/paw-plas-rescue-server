import { z } from "zod";

export const mongoObjectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a 24-character hexadecimal identifier");

export const storyIdParamsSchema = z.object({
  id: mongoObjectIdSchema,
});
