import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeCinUpload } from "./cin.analysis";
import * as ollamaVision from "./ollama.vision";
import * as uploadValidation from "./upload.validation";
import * as visionResponse from "./vision.response";

function validUpload(): uploadValidation.ValidatedUpload {
  return {
    fileName: "specimen-fictif.png",
    mimeType: "image/png",
    size: 12,
    buffer: Buffer.from("image-fictive"),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cin.analysis", () => {
  it("enchaîne la validation, la vision locale et le parseur strict", async () => {
    const input = { fichier: "fictif" };
    const modelText = '{"classification":"cin"}';
    const expectedAnalysis = {
      status: "success" as const,
      engineVersion: "ocr-v1" as const,
      fields: {
        nom: "TESTEUR",
        prénom: "AMINA",
        dateNaissance: "2000-01-01",
        numeroCIN: "ZZ000000",
        dateFinValidite: "2030-12-31",
      },
    };

    const uploadSpy = vi
      .spyOn(uploadValidation, "validateUpload")
      .mockReturnValue(validUpload());
    const visionSpy = vi
      .spyOn(ollamaVision, "analyzeImageWithLocalVision")
      .mockResolvedValue(modelText);
    const parserSpy = vi
      .spyOn(visionResponse, "parseVisionResponse")
      .mockReturnValue(expectedAnalysis);

    await expect(analyzeCinUpload(input)).resolves.toEqual(expectedAnalysis);
    expect(uploadSpy).toHaveBeenCalledWith(input);
    expect(visionSpy).toHaveBeenCalledWith(Buffer.from("image-fictive"));
    expect(parserSpy).toHaveBeenCalledWith(modelText);
  });

  it("rejette un fichier avant tout appel au moteur local", async () => {
    vi.spyOn(uploadValidation, "validateUpload").mockImplementation(() => {
      throw new uploadValidation.UploadValidationError(
        "INVALID_INPUT",
        "Fichier invalide.",
      );
    });
    const visionSpy = vi.spyOn(ollamaVision, "analyzeImageWithLocalVision");

    await expect(analyzeCinUpload({})).resolves.toEqual({
      status: "error",
      engineVersion: "ocr-v1",
      fields: {
        nom: null,
        prénom: null,
        dateNaissance: null,
        numeroCIN: null,
        dateFinValidite: null,
      },
      code: "FILE_REJECTED",
    });
    expect(visionSpy).not.toHaveBeenCalled();
  });

  it("retourne une erreur sûre lorsque le moteur local est indisponible", async () => {
    vi.spyOn(uploadValidation, "validateUpload").mockReturnValue(validUpload());
    vi.spyOn(ollamaVision, "analyzeImageWithLocalVision").mockRejectedValue(
      new ollamaVision.OllamaVisionError(
        "OLLAMA_UNAVAILABLE",
        "Moteur local indisponible.",
      ),
    );

    await expect(analyzeCinUpload({})).resolves.toMatchObject({
      status: "error",
      code: "OCR_UNAVAILABLE",
    });
  });

  it("masque une réponse invalide du modèle derrière une erreur interne sûre", async () => {
    vi.spyOn(uploadValidation, "validateUpload").mockReturnValue(validUpload());
    vi.spyOn(ollamaVision, "analyzeImageWithLocalVision").mockResolvedValue(
      "réponse malformée",
    );
    vi.spyOn(visionResponse, "parseVisionResponse").mockImplementation(() => {
      throw new visionResponse.VisionResponseError(
        "INVALID_MODEL_JSON",
        "JSON invalide.",
      );
    });

    await expect(analyzeCinUpload({})).resolves.toMatchObject({
      status: "error",
      code: "INTERNAL_ERROR",
    });
  });
});
