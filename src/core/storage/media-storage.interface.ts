export interface UploadFile {
  buffer?: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
  path?: string;
}

export interface IMediaStorage {
  /**
   * Upload an image file and return the public URL.
   */
  uploadImage(file: UploadFile, folder?: string): Promise<string>;

  /**
   * Optional method to delete an image by URL or public ID.
   */
  deleteImage?(publicIdOrUrl: string): Promise<void>;
}
