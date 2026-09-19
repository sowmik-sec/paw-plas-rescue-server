import { describe, it, expect, vi, beforeEach } from "vitest";
import { UsersService } from "../../src/features/users/users.service";
import { ForbiddenError, NotFoundError } from "../../src/core/errors/app-error";

describe("UsersService Unit Seam", () => {
  const mockUsersRepository = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findAll: vi.fn(),
    updateRole: vi.fn(),
    deleteById: vi.fn(),
  };

  let usersService: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    usersService = new UsersService(mockUsersRepository as any);
  });

  describe("registerUser", () => {
    it("creates and returns new user with insertedId when email is not registered", async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      mockUsersRepository.create.mockResolvedValue({
        id: "usr_123",
        name: "Jane Doe",
        email: "jane@example.com",
        image: "https://example.com/avatar.jpg",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await usersService.registerUser({
        name: "Jane Doe",
        email: "jane@example.com",
        image: "https://example.com/avatar.jpg",
      });

      expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith("jane@example.com");
      expect(mockUsersRepository.create).toHaveBeenCalledWith({
        name: "Jane Doe",
        email: "jane@example.com",
        image: "https://example.com/avatar.jpg",
        role: "user",
      });
      expect(result.isNew).toBe(true);
      expect(result.insertedId).toBe("usr_123");
      expect(result.user.email).toBe("jane@example.com");
    });

    it("idempotently returns existing user with insertedId null without creating duplicate", async () => {
      const existingUser = {
        id: "usr_456",
        name: "Jane Doe",
        email: "jane@example.com",
        image: "https://example.com/avatar.jpg",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUsersRepository.findByEmail.mockResolvedValue(existingUser);

      const result = await usersService.registerUser({
        name: "Jane Doe",
        email: "jane@example.com",
      });

      expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith("jane@example.com");
      expect(mockUsersRepository.create).not.toHaveBeenCalled();
      expect(result.isNew).toBe(false);
      expect(result.insertedId).toBeNull();
      expect(result.message).toBe("User already exists");
      expect(result.user.id).toBe("usr_456");
    });
  });

  describe("checkAdminStatus", () => {
    it("returns admin true when authenticated user has admin role in database", async () => {
      mockUsersRepository.findByEmail.mockResolvedValue({
        id: "admin_1",
        email: "admin@example.com",
        role: "admin",
        name: "Admin",
      });

      const result = await usersService.checkAdminStatus(
        "admin@example.com",
        "admin@example.com"
      );

      expect(result.admin).toBe(true);
    });

    it("returns admin false when user has regular role", async () => {
      mockUsersRepository.findByEmail.mockResolvedValue({
        id: "usr_1",
        email: "regular@example.com",
        role: "user",
        name: "Regular",
      });

      const result = await usersService.checkAdminStatus(
        "regular@example.com",
        "regular@example.com"
      );

      expect(result.admin).toBe(false);
    });

    it("returns admin false when user is not found in database", async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);

      const result = await usersService.checkAdminStatus(
        "missing@example.com",
        "missing@example.com"
      );

      expect(result.admin).toBe(false);
    });

    it("throws ForbiddenError when requester email does not match target email", async () => {
      await expect(
        usersService.checkAdminStatus("target@example.com", "other@example.com")
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("getAllUsers", () => {
    it("retrieves all users from repository", async () => {
      const usersList = [
        { id: "1", name: "User 1", email: "u1@test.com", role: "user" },
        { id: "2", name: "User 2", email: "u2@test.com", role: "admin" },
      ];
      mockUsersRepository.findAll.mockResolvedValue(usersList);

      const result = await usersService.getAllUsers();

      expect(mockUsersRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0].email).toBe("u1@test.com");
    });
  });

  describe("promoteToAdmin", () => {
    it("promotes user role to admin and returns modified result", async () => {
      mockUsersRepository.findById.mockResolvedValue({
        id: "usr_1",
        name: "User 1",
        email: "u1@test.com",
        role: "user",
      });
      mockUsersRepository.updateRole.mockResolvedValue({
        id: "usr_1",
        name: "User 1",
        email: "u1@test.com",
        role: "admin",
      });

      const result = await usersService.promoteToAdmin("usr_1");

      expect(mockUsersRepository.findById).toHaveBeenCalledWith("usr_1");
      expect(mockUsersRepository.updateRole).toHaveBeenCalledWith("usr_1", "admin");
      expect(result.modifiedCount).toBe(1);
      expect(result.user.role).toBe("admin");
    });

    it("throws NotFoundError when user to promote does not exist", async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(usersService.promoteToAdmin("nonexistent")).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("deleteUser", () => {
    it("deletes user and returns deletedCount", async () => {
      mockUsersRepository.findById.mockResolvedValue({
        id: "usr_1",
        name: "User 1",
        email: "u1@test.com",
        role: "user",
      });
      mockUsersRepository.deleteById.mockResolvedValue({
        id: "usr_1",
        name: "User 1",
        email: "u1@test.com",
        role: "user",
      });

      const result = await usersService.deleteUser("usr_1");

      expect(mockUsersRepository.findById).toHaveBeenCalledWith("usr_1");
      expect(mockUsersRepository.deleteById).toHaveBeenCalledWith("usr_1");
      expect(result.deletedCount).toBe(1);
    });

    it("throws NotFoundError when user to delete does not exist", async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(usersService.deleteUser("nonexistent")).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
