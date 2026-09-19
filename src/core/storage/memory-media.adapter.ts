import { IMediaStorage, UploadFile } from "./media-storage.interface";

export class MemoryMediaAdapter implements IMediaStorage {
  private uploads = new Map<string, UploadFile>();
  private counter = 0;

  async uploadImage(file: UploadFile, folder = "pets"): Promise<string> {
    this.counter += 1;
    const fileExtension = file.originalname?.split(".").pop() || "jpg";
    const filename = `mock-image-${this.counter}.${fileExtension}`;
    const url = `https://res.cloudinary.com/mock-cloud/image/upload/${folder}/${filename}`;

    this.uploads.set(url, file);
    return url;
  }

  async deleteImage(publicIdOrUrl: string): Promise<void> {
    this.uploads.delete(publicIdOrUrl);
  }

  getUploadedFile(url: string): UploadFile | undefined {
    return this.uploads.get(url);
  }

  getAllUploads(): Map<string, UploadFile> {
    return new Map(this.uploads);
  }

  clear(): void {
    this.uploads.clear();
    this.counter = 0;
  }
}

export const memoryMediaAdapter = new MemoryMediaAdapter();
