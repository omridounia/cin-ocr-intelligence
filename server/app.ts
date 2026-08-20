import express from "express";
import type { ErrorRequestHandler } from "express";
import {
  cinAnalysisSchema,
  emptyCinFields,
  OCR_ENGINE_VERSION,
} from "../shared/cin.contract";
import type { CinAnalysis } from "../shared/cin.contract";
import { analyzeCinUpload } from "./cin.analysis";

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

function statusForAnalysis(analysis: CinAnalysis): number {
  if (analysis.status !== "error") {
    return 200;
  }

  if (analysis.code === "FILE_REJECTED") {
    return 400;
  }

  if (analysis.code === "OCR_UNAVAILABLE") {
    return 503;
  }

  return 500;
}

/**
 * Construit l’API HTTP. L’application ne persiste aucune image et ne révèle
 * jamais la réponse brute du modèle de vision.
 */
export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "10mb", strict: true }));

  app.get("/api/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.post("/api/analyze", async (request, response) => {
    try {
      const analysis = cinAnalysisSchema.parse(
        await analyzeCinUpload(request.body),
      );

      response.status(statusForAnalysis(analysis)).json(analysis);
    } catch {
      const safeError = createErrorAnalysis("INTERNAL_ERROR");
      response.status(500).json(safeError);
    }
  });

  const errorHandler: ErrorRequestHandler = (
    _error,
    _request,
    response,
    _next,
  ) => {
    if (response.headersSent) {
      return;
    }

    const safeError = createErrorAnalysis("FILE_REJECTED");
    response.status(400).json(safeError);
  };

  app.use(errorHandler);

  return app;
}
