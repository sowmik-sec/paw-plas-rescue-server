import { describe, it, expect, beforeEach } from "vitest";
import { MemoryMediaAdapter } from "../../src/core/storage/memory-media.adapter";

describe("Media Storage Adapters", () => {
  describe("MemoryMediaAdapter", () => {
    let adapter: MemoryMediaAdapter;

    beforeEach(() => {
      adapter = new MemoryMediaAdapter();
    });

    it("uploads a file and returns a deterministic URL with folder and filename", async () => {
      const file = {
        buffer: Buffer.from("dummy image content"),
        originalname: "golden-retriever.png",
        mimetype: "image/png",
        size: 1024,
      };

      const url = await adapter.uploadImage(file, "pets");
      expect(url).toBe(
        "https://res.cloudinary.com/mock-cloud/image/upload/pets/mock-image-1.png"
      );

      const stored = adapter.getUploadedFile(url);
      expect(stored).toEqual(file);
    });

    it("increments the file counter for successive uploads", async () => {
      const file1 = { originalname: "cat.jpg" };
      const file2 = { originalname: "dog.jpg" };

      const url1 = await adapter.uploadImage(file1, "pets");
      const url2 = await adapter.uploadImage(file2, "pets");

      expect(url1).toContain("mock-image-1.jpg");
      expect(url2).toContain("mock-image-2.jpg");
    });

    it("deletes a stored file", async () => {
      const file = { originalname: "cat.jpg" };
      const url = await adapter.uploadImage(file, "pets");

      expect(adapter.getUploadedFile(url)).toBeDefined();
      await adapter.deleteImage(url);
      expect(adapter.getUploadedFile(url)).toBeUndefined();
    });

    it("clears all stored uploads", async () => {
      await adapter.uploadImage({ originalname: "cat.jpg" });
      await adapter.uploadImage({ originalname: "dog.jpg" });

      expect(adapter.getAllUploads().size).toBe(2);
      adapter.clear();
      expect(adapter.getAllUploads().size).toBe(0);
    });
  });
});
