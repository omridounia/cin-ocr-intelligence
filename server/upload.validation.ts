import * as path from "node:path";
import { z } from "zod";

export const MAX_UPLOAD_BYTES = 7 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = Math.ceil(MAX_UPLOAD_BYTES * (4 / 3)) + 128;

export const allowedImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageMimeType = (typeof allowedImageMimeTypes)[number];

const extensionToMimeType: Record<string, AllowedImageMimeType> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export const uploadInputSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.enum(allowedImageMimeTypes),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  dataUrl: z.string().min(1).max(MAX_DATA_URL_LENGTH),
}).strict();

export type UploadInput = z.infer<typeof uploadInputSchema>;

export type ValidatedUpload = {
  fileName: string;
  mimeType: AllowedImageMimeType;
  size: number;
  buffer: Buffer;
};

export type UploadErrorCode =
  | "INVALID_INPUT"
  | "INVALID_FILE_NAME"
  | "UNSUPPORTED_EXTENSION"
  | "MIME_EXTENSION_MISMATCH"
  | "INVALID_DATA_URL"
  | "INVALID_FILE_SIZE"
  | "SIGNATURE_MISMATCH";

export class UploadValidationError extends Error {
  constructor(
    public readonly code: UploadErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "UploadValidationError";
  }
}

function detectImageMimeType(buffer: Buffer): AllowedImageMimeType | null {
  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  if (isJpeg) {
    return "image/jpeg";
  }

  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  if (
    buffer.length >= pngSignature.length &&
    buffer.subarray(0, pngSignature.length).equals(pngSignature)
  ) {
    return "image/png";
  }

  const isWebp =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";

  if (isWebp) {
    return "image/webp";
  }

  return null;
}

function decodeDataUrl(
  dataUrl: string,
  expectedMimeType: AllowedImageMimeType,
): Buffer {
  const match = dataUrl.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/,
  );
  const declaredMimeType = match?.[1];
  const encodedPayload = match?.[2];

  if (
    declaredMimeType !== expectedMimeType ||
    !encodedPayload ||
    encodedPayload.length % 4 !== 0
  ) {
    throw new UploadValidationError(
      "INVALID_DATA_URL",
      "Le contenu de l’image est invalide.",
    );
  }

  return Buffer.from(encodedPayload, "base64");
}

export function validateUpload(input: unknown): ValidatedUpload {
  const parsed = uploadInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new UploadValidationError(
      "INVALID_INPUT",
      "Le fichier ne respecte pas les limites d’import autorisées.",
    );
  }

  const { fileName, mimeType, size, dataUrl } = parsed.data;
  const containsPathSeparator = fileName.includes("/") || fileName.includes("\\");

  if (containsPathSeparator || fileName !== path.basename(fileName)) {
    throw new UploadValidationError(
      "INVALID_FILE_NAME",
      "Le nom du fichier ne doit pas contenir de chemin.",
    );
  }

  const extension = path.extname(fileName).toLowerCase();
  const extensionMimeType = extensionToMimeType[extension];

  if (!extensionMimeType) {
    throw new UploadValidationError(
      "UNSUPPORTED_EXTENSION",
      "Seules les images JPEG, PNG ou WebP sont acceptées.",
    );
  }

  if (extensionMimeType !== mimeType) {
    throw new UploadValidationError(
      "MIME_EXTENSION_MISMATCH",
      "L’extension et le type déclaré du fichier ne correspondent pas.",
    );
  }

  const buffer = decodeDataUrl(dataUrl, mimeType);

  if (buffer.length !== size || buffer.length > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError(
      "INVALID_FILE_SIZE",
      "La taille réelle du fichier est invalide ou dépasse 7 Mo.",
    );
  }

  const detectedMimeType = detectImageMimeType(buffer);

  if (!detectedMimeType || detectedMimeType !== mimeType) {
    throw new UploadValidationError(
      "SIGNATURE_MISMATCH",
      "Le contenu binaire ne correspond pas à une image autorisée.",
    );
  }

  return {
    fileName,
    mimeType,
    size: buffer.length,
    buffer,
  };
}
