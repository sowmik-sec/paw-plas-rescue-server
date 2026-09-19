import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { AuthService } from "../../src/features/auth/auth.service";
import { UsersService } from "../../src/features/users/users.service";
import { UsersController } from "../../src/features/users/users.controller";
import { createUsersRouter } from "../../src/features/users/users.routes";
import {
  createAuthenticateMiddleware,
  createRequireAdminMiddleware,
} from "../../src/features/auth/auth.middleware";

describe("Users Feature HTTP Seam", () => {
  const secret = "test-integration-secret-key-12345";
  const authService = new AuthService(secret);

  const mockUsersRepo = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findAll: vi.fn(),
    updateRole: vi.fn(),
    deleteById: vi.fn(),
  };

  const usersService = new UsersService(mockUsersRepo as any);
  const usersController = new UsersController(usersService);
  const authenticateMiddleware = createAuthenticateMiddleware(authService);
  const requireAdminMiddleware = createRequireAdminMiddleware(mockUsersRepo as any);

  const customUsersRouter = createUsersRouter({
    controller: usersController,
    authenticateMiddleware,
    requireAdminMiddleware,
  });

  const app = createApp({
    usersRouter: customUsersRouter,
  });

  const generateToken = (email: string) => authService.generateToken({ email });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/users & POST /users (Registration)", () => {
    it("creates a new user and returns 201 with insertedId on RESTful path", async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(null);
      mockUsersRepo.create.mockResolvedValue({
        id: "usr_new_1",
        name: "Alice",
        email: "alice@example.com",
        image: "https://example.com/alice.jpg",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app).post("/api/v1/users").send({
        name: "Alice",
        email: "alice@example.com",
        image: "https://example.com/alice.jpg",
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.insertedId).toBe("usr_new_1");
      expect(response.body.user.name).toBe("Alice");
      expect(response.body.user._id).toBe("usr_new_1");
    });

    it("idempotently handles existing user on legacy /users path", async () => {
      mockUsersRepo.findByEmail.mockResolvedValue({
        id: "usr_existing_1",
        name: "Bob",
        email: "bob@example.com",
        image: null,
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app).post("/users").send({
        name: "Bob",
        email: "bob@example.com",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.insertedId).toBeNull();
      expect(response.body.message).toBe("User already exists");
      expect(mockUsersRepo.create).not.toHaveBeenCalled();
    });

    it("returns 400 when registration body is invalid", async () => {
      const response = await request(app).post("/api/v1/users").send({
        email: "not-an-email",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/users/admin/:email (Admin Verification)", () => {
    it("returns 401 when authorization token is omitted", async () => {
      const response = await request(app).get("/api/v1/users/admin/alice@example.com");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("returns 403 when token email does not match requested email", async () => {
      const token = generateToken("different@example.com");

      const response = await request(app)
        .get("/api/v1/users/admin/alice@example.com")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("returns admin true when user is an admin", async () => {
      const adminEmail = "admin@example.com";
      const token = generateToken(adminEmail);
      mockUsersRepo.findByEmail.mockResolvedValue({
        id: "admin_1",
        email: adminEmail,
        role: "admin",
        name: "Admin User",
      });

      const response = await request(app)
        .get(`/api/v1/users/admin/${adminEmail}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.admin).toBe(true);
    });

    it("returns admin false when user is not an admin", async () => {
      const userEmail = "regular@example.com";
      const token = generateToken(userEmail);
      mockUsersRepo.findByEmail.mockResolvedValue({
        id: "user_1",
        email: userEmail,
        role: "user",
        name: "Regular User",
      });

      const response = await request(app)
        .get(`/users/admin/${userEmail}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.admin).toBe(false);
    });
  });

  describe("GET /api/v1/users (Admin-only Users List)", () => {
    it("returns 401 if token is missing", async () => {
      const response = await request(app).get("/api/v1/users");
      expect(response.status).toBe(401);
    });

    it("returns 403 if requester is not an admin", async () => {
      const token = generateToken("user@example.com");
      mockUsersRepo.findByEmail.mockResolvedValue({
        id: "usr_1",
        email: "user@example.com",
        role: "user",
      });

      const response = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("returns list of users with _id compatibility for admin user", async () => {
      const adminToken = generateToken("admin@example.com");
      mockUsersRepo.findByEmail.mockResolvedValue({
        id: "admin_1",
        email: "admin@example.com",
        role: "admin",
      });
      mockUsersRepo.findAll.mockResolvedValue([
        {
          id: "1",
          name: "User One",
          email: "u1@example.com",
          role: "user",
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const response = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]._id).toBe("1");
      expect(response.body[0].name).toBe("User One");
    });
  });

  describe("PATCH /api/v1/users/admin/:id (Promote to Admin)", () => {
    it("promotes user to admin role and returns modifiedCount 1", async () => {
      const adminToken = generateToken("admin@example.com");
      mockUsersRepo.findByEmail.mockResolvedValue({
        id: "admin_1",
        email: "admin@example.com",
        role: "admin",
      });
      mockUsersRepo.findById.mockResolvedValue({
        id: "target_user_id",
        name: "Target User",
        email: "target@example.com",
        role: "user",
      });
      mockUsersRepo.updateRole.mockResolvedValue({
        id: "target_user_id",
        name: "Target User",
        email: "target@example.com",
        role: "admin",
        image: null,
      });

      const response = await request(app)
        .patch("/api/v1/users/admin/target_user_id")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.modifiedCount).toBe(1);
      expect(response.body.user.role).toBe("admin");
      expect(mockUsersRepo.updateRole).toHaveBeenCalledWith("target_user_id", "admin");
    });
  });

  describe("DELETE /api/v1/users/:id (Delete User)", () => {
    it("deletes user account and returns deletedCount 1", async () => {
      const adminToken = generateToken("admin@example.com");
      mockUsersRepo.findByEmail.mockResolvedValue({
        id: "admin_1",
        email: "admin@example.com",
        role: "admin",
      });
      mockUsersRepo.findById.mockResolvedValue({
        id: "user_to_delete",
        name: "Old User",
        email: "old@example.com",
        role: "user",
      });
      mockUsersRepo.deleteById.mockResolvedValue({
        id: "user_to_delete",
        name: "Old User",
        email: "old@example.com",
        role: "user",
      });

      const response = await request(app)
        .delete("/api/v1/users/user_to_delete")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.deletedCount).toBe(1);
    });
  });
});
