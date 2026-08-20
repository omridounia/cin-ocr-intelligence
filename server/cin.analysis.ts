import {
  emptyCinFields,
  OCR_ENGINE_VERSION,
} from "../shared/cin.contract";
import type { CinAnalysis } from "../shared/cin.contract";
import {
  analyzeImageWithLocalVision,
  OllamaVisionError,
} from "./ollama.vision";
import {
  UploadValidationError,
  validateUpload,
} from "./upload.validation";
import {
  parseVisionResponse,
  VisionResponseError,
} from "./vision.response";

function createErrorAnalysis(
  code: "FILE_REJECTED" | "OCR_UNAVAILABLE" | "INTERNAL_ERROR",
): CinAnalysis {
  return {
    status: "error",
    engineVersion: OCR_ENGINE_VERSION,
    fields: emptyCinFields(),
    code,
  };
}

/**
 * Orchestre l'analyse d'un spécimen fictif de CIN.
 * Aucune donnée n'est stockée et aucune réponse du modèle n'est renvoyée sans
 * validation stricte préalable.
 */
export async function analyzeCinUpload(input: unknown): Promise<CinAnalysis> {
  let upload: ReturnType<typeof validateUpload>;

  try {
    upload = validateUpload(input);
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return createErrorAnalysis("FILE_REJECTED");
    }

    return createErrorAnalysis("INTERNAL_ERROR");
  }

  let modelText: string;

  try {
    modelText = await analyzeImageWithLocalVision(upload.buffer);
  } catch (error) {
    if (error instanceof OllamaVisionError) {
      return createErrorAnalysis("OCR_UNAVAILABLE");
    }

    return createErrorAnalysis("INTERNAL_ERROR");
  }

  try {
    return parseVisionResponse(modelText);
  } catch (error) {
    if (error instanceof VisionResponseError) {
      return createErrorAnalysis("INTERNAL_ERROR");
    }

    return createErrorAnalysis("INTERNAL_ERROR");
  }
}
