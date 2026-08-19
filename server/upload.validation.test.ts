import { describe, expect, it } from "vitest";
import {
  UploadValidationError,
  validateUpload,
} from "./upload.validation";

const pngBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47,
  0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d,
]);

function validPngInput() {
  return {
    fileName: "specimen-fictif.png",
    mimeType: "image/png" as const,
    size: pngBuffer.length,
    dataUrl: `data:image/png;base64,${pngBuffer.toString("base64")}`,
  };
}

describe("upload.validation", () => {
  it("accepte une image PNG dont l’extension, le MIME et la signature concordent", () => {
    const result = validateUpload(validPngInput());

    expect(result.mimeType).toBe("image/png");
    expect(result.size).toBe(pngBuffer.length);
    expect(result.buffer.equals(pngBuffer)).toBe(true);
  });

  it("rejette une extension non autorisée avant tout traitement OCR", () => {
    expect(() => validateUpload({
      ...validPngInput(),
      fileName: "document.pdf",
    })).toThrow(UploadValidationError);
  });

  it("rejette une extension et un MIME incohérents", () => {
    expect(() => validateUpload({
      ...validPngInput(),
      fileName: "specimen-fictif.jpg",
    })).toThrow(UploadValidationError);
  });

  it("rejette un contenu binaire qui se présente faussement comme une image", () => {
    const textBuffer = Buffer.from("ceci-n-est-pas-une-image", "utf8");

    expect(() => validateUpload({
      fileName: "faux.png",
      mimeType: "image/png",
      size: textBuffer.length,
      dataUrl: `data:image/png;base64,${textBuffer.toString("base64")}`,
    })).toThrow(UploadValidationError);
  });

  it("rejette une taille déclarée différente de la taille réelle", () => {
    expect(() => validateUpload({
      ...validPngInput(),
      size: pngBuffer.length + 1,
    })).toThrow(UploadValidationError);
  });

  it("rejette un nom de fichier contenant un chemin", () => {
    expect(() => validateUpload({
      ...validPngInput(),
      fileName: "dossier/specimen-fictif.png",
    })).toThrow(UploadValidationError);
  });
});
