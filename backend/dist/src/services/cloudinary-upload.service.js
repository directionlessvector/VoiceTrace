"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAudioToCloudinary = uploadAudioToCloudinary;
exports.uploadImageToCloudinary = uploadImageToCloudinary;
const cloudinary_1 = require("cloudinary");
const stream_1 = require("stream");
let isConfigured = false;
function ensureCloudinaryConfigured() {
    if (isConfigured)
        return;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET");
    }
    cloudinary_1.v2.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
    });
    isConfigured = true;
}
async function uploadAudioToCloudinary(input) {
    ensureCloudinaryConfigured();
    const folder = process.env.CLOUDINARY_VOICE_FOLDER || "voicetrace/audio";
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            resource_type: "video",
            use_filename: true,
            unique_filename: true,
            overwrite: false,
            filename_override: input.originalFilename || undefined,
        }, (error, result) => {
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
        });
        stream_1.Readable.from(input.buffer).pipe(stream);
    });
}
async function uploadImageToCloudinary(input) {
    ensureCloudinaryConfigured();
    const folder = process.env.CLOUDINARY_LEDGER_FOLDER || "voicetrace/ledger-images";
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            resource_type: "image",
            use_filename: true,
            unique_filename: true,
            overwrite: false,
            filename_override: input.originalFilename || undefined,
        }, (error, result) => {
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
        });
        stream_1.Readable.from(input.buffer).pipe(stream);
    });
}
