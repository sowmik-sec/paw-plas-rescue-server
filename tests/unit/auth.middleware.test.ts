import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import {
  createAuthenticateMiddleware,
  createRequireAdminMiddleware,
} from "../../src/features/auth/auth.middleware";
import { AuthService } from "../../src/features/auth/auth.service";
import { UnauthorizedError, ForbiddenError } from "../../src/core/errors/app-error";

describe("Auth Middleware Seam", () => {
  const secret = "test-auth-secret-12345";
  const authService = new AuthService(secret);

  const mockUsersRepository = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findAll: vi.fn(),
    updateRole: vi.fn(),
    deleteById: vi.fn(),
  };

  const authenticate = createAuthenticateMiddleware(authService);
  const requireAdmin = createRequireAdminMiddleware(mockUsersRepository as any);

  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      headers: {},
    };
    res = {};
    next = vi.fn();
  });

  describe("authenticate middleware", () => {
    it("calls next with UnauthorizedError when authorization header is missing", () => {
      authenticate(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("calls next with UnauthorizedError when authorization header format is invalid", () => {
      req.headers = { authorization: "Basic 12345" };
      authenticate(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("calls next with UnauthorizedError when token is invalid or corrupted", () => {
      req.headers = { authorization: "Bearer invalid.token.value" };
      authenticate(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("attaches decoded user to req.user and req.decoded and calls next() on valid token", () => {
      const token = authService.generateToken({ email: "user@example.com" });
      req.headers = { authorization: `Bearer ${token}` };

      authenticate(req as Request, res as Response, next);

      expect(req.user).toBeDefined();
      expect(req.user?.email).toBe("user@example.com");
      expect(req.decoded?.email).toBe("user@example.com");
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("requireAdmin middleware", () => {
    it("calls next with UnauthorizedError when req.user is missing", async () => {
      await requireAdmin(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("calls next with ForbiddenError when user does not exist in database", async () => {
      req.user = { email: "nonexistent@example.com" };
      mockUsersRepository.findByEmail.mockResolvedValue(null);

      await requireAdmin(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it("calls next with ForbiddenError when user has regular 'user' role", async () => {
      req.user = { email: "regular@example.com" };
      mockUsersRepository.findByEmail.mockResolvedValue({
        id: "1",
        email: "regular@example.com",
        role: "user",
        name: "Regular User",
      });

      await requireAdmin(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it("calls next() when user has 'admin' role", async () => {
      req.user = { email: "admin@example.com" };
      mockUsersRepository.findByEmail.mockResolvedValue({
        id: "2",
        email: "admin@example.com",
        role: "admin",
        name: "Admin User",
      });

      await requireAdmin(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
