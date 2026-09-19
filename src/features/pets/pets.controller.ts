import { Request, Response, NextFunction } from "express";
import { PetsService, petsService as defaultPetsService } from "./pets.service";
import {
  createPetSchema,
  updatePetSchema,
  petIdParamSchema,
  petQuerySchema,
} from "./pets.schema";
import { ValidationError } from "../../core/errors/app-error";

export class PetsController {
  private service: PetsService;

  constructor(service?: PetsService) {
    this.service = service || defaultPetsService;
  }

  getAvailablePets = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = petQuerySchema.parse(req.query);
      const result = await this.service.getAvailablePets(query);

      // Map pets to include _id compatibility for frontend TanStack/Axios consumers
      const petsWithCompatId = result.pets.map((pet) => ({
        ...pet,
        _id: pet.id,
      }));

      res.status(200).json({
        pets: petsWithCompatId,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        totalPets: result.totalPets,
      });
    } catch (error) {
      next(error);
    }
  };

  getPetById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = petIdParamSchema.parse(req.params);
      const pet = await this.service.getPetById(id);

      res.status(200).json({
        ...pet,
        _id: pet.id,
      });
    } catch (error) {
      next(error);
    }
  };

  createPet = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const body = createPetSchema.parse(req.body);
      const pet = await this.service.createPet(body, req.file, req.user);

      res.status(201).json({
        acknowledged: true,
        insertedId: pet.id,
        pet: {
          ...pet,
          _id: pet.id,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  updatePet = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = petIdParamSchema.parse(req.params);
      const body = updatePetSchema.parse(req.body);
      const updatedPet = await this.service.updatePet(
        id,
        body,
        req.file,
        req.user
      );

      res.status(200).json({
        acknowledged: true,
        modifiedCount: 1,
        pet: {
          ...updatedPet,
          _id: updatedPet.id,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  deletePet = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = petIdParamSchema.parse(req.params);
      await this.service.deletePet(id, req.user);

      res.status(200).json({
        acknowledged: true,
        deletedCount: 1,
      });
    } catch (error) {
      next(error);
    }
  };

  getOwnerPets = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const email =
        req.user?.email || (req.query.email as string | undefined);

      if (!email) {
        throw new ValidationError("Owner email is required");
      }

      const pets = await this.service.getPetsByOwner(email);
      const petsWithCompatId = pets.map((pet) => ({
        ...pet,
        _id: pet.id,
      }));

      res.status(200).json(petsWithCompatId);
    } catch (error) {
      next(error);
    }
  };
}

export const petsController = new PetsController();
