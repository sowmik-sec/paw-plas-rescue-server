import { Request, Response, NextFunction } from "express";
import { AnyZodObject } from "zod";

type RequestSchemas = {
  params?: AnyZodObject;
  query?: AnyZodObject;
  body?: AnyZodObject;
};

/**
 * Perimeter validation middleware: parses the request against the provided
 * Zod schemas, replacing each section with its parsed (coerced) value.
 * ZodError instances bubble to the global error handler as structured 400s.
 */
export const validateRequest =
  (schemas: RequestSchemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    next();
  };
