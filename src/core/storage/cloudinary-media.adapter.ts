import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { IMediaStorage, UploadFile } from "./media-storage.interface";
import { getEnv } from "../config/env";
import { AppError } from "../errors/app-error";

export class CloudinaryMediaAdapter implements IMediaStorage {
  private configured = false;

  constructor() {
    this.ensureConfigured();
  }

  private ensureConfigured(): void {
    if (this.configured) return;

    try {
      const env = getEnv();
      if (
        env.CLOUDINARY_CLOUD_NAME &&
        env.CLOUDINARY_API_KEY &&
        env.CLOUDINARY_API_SECRET
      ) {
        cloudinary.config({
          cloud_name: env.CLOUDINARY_CLOUD_NAME,
          api_key: env.CLOUDINARY_API_KEY,
          api_secret: env.CLOUDINARY_API_SECRET,
        });
        this.configured = true;
      }
    } catch {
      // Allow fallback if env is not completely configured during startup
    }
  }

  async uploadImage(file: UploadFile, folder = "pets"): Promise<string> {
    this.ensureConfigured();

    if (file.path) {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          folder,
        });
        return result.secure_url;
      } catch (error: any) {
        throw new AppError(
          `Cloudinary upload failed: ${error.message || "Unknown error"}`,
          500
        );
      }
    }

    if (file.buffer) {
      return new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder },
          (error: any, result?: UploadApiResponse) => {
            if (error || !result) {
              return reject(
                new AppError(
                  `Cloudinary upload stream failed: ${
                    error?.message || "Unknown error"
                  }`,
                  500
                )
              );
            }
            resolve(result.secure_url);
          }
        );

        uploadStream.end(file.buffer);
      });
    }

    throw new AppError("No file buffer or file path provided for upload", 400);
  }

  async deleteImage(publicIdOrUrl: string): Promise<void> {
    this.ensureConfigured();
    try {
      // If full URL is passed, extract public ID or pass directly
      const publicId = this.extractPublicId(publicIdOrUrl);
      await cloudinary.uploader.destroy(publicId);
    } catch (error: any) {
      throw new AppError(
        `Cloudinary deletion failed: ${error.message || "Unknown error"}`,
        500
      );
    }
  }

  private extractPublicId(urlOrId: string): string {
    if (!urlOrId.includes("http")) {
      return urlOrId;
    }
    const parts = urlOrId.split("/");
    const filenameWithExt = parts[parts.length - 1];
    const folder = parts[parts.length - 2];
    const filename = filenameWithExt.split(".")[0];
    return folder ? `${folder}/${filename}` : filename;
  }
}

export const cloudinaryMediaAdapter = new CloudinaryMediaAdapter();
