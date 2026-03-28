import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

export type CloudinaryAudioUploadResult = {
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  cloudinaryFormat?: string;
  cloudinaryVersion?: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
};

let isConfigured = false;

function ensureCloudinaryConfigured() {
  if (isConfigured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  isConfigured = true;
}

export async function uploadAudioToCloudinary(input: {
  buffer: Buffer;
  originalFilename: string;
}): Promise<CloudinaryAudioUploadResult> {
  ensureCloudinaryConfigured();

  const folder = process.env.CLOUDINARY_VOICE_FOLDER || "voicetrace/audio";

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "video",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        filename_override: input.originalFilename || undefined,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }

        resolve({
          cloudinaryUrl: result.secure_url,
          cloudinaryPublicId: result.public_id,
          cloudinaryFormat: result.format,
          cloudinaryVersion: String(result.version ?? ""),
          fileSizeBytes: typeof result.bytes === "number" ? result.bytes : undefined,
          durationSeconds: typeof result.duration === "number" ? Math.round(result.duration) : undefined,
        });
      }
    );

    Readable.from(input.buffer).pipe(stream);
  });
}

export type CloudinaryImageUploadResult = {
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  cloudinaryFormat?: string;
  cloudinaryVersion?: string;
  fileSizeBytes?: number;
};

export async function uploadImageToCloudinary(input: {
  buffer: Buffer;
  originalFilename: string;
}): Promise<CloudinaryImageUploadResult> {
  ensureCloudinaryConfigured();

  const folder = process.env.CLOUDINARY_LEDGER_FOLDER || "voicetrace/ledger-images";

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        filename_override: input.originalFilename || undefined,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary image upload failed"));
          return;
        }

        resolve({
          cloudinaryUrl: result.secure_url,
          cloudinaryPublicId: result.public_id,
          cloudinaryFormat: result.format,
          cloudinaryVersion: String(result.version ?? ""),
          fileSizeBytes: typeof result.bytes === "number" ? result.bytes : undefined,
        });
      }
    );

    Readable.from(input.buffer).pipe(stream);
  });
}