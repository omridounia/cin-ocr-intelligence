import { z } from "zod";
import {
  cinFieldsSchema,
  emptyCinFieldsSchema,
  OCR_ENGINE_VERSION,
} from "../shared/cin.contract";
import type { CinAnalysis, CinFields } from "../shared/cin.contract";

const rawVisionResponseSchema = z.discriminatedUnion("classification", [
  z
    .object({
      classification: z.literal("cin"),
      fields: cinFieldsSchema,
    })
    .strict(),
  z
    .object({
      classification: z.literal("not-cin"),
      fields: emptyCinFieldsSchema,
    })
    .strict(),
  z
    .object({
      classification: z.literal("unreadable"),
      fields: emptyCinFieldsSchema,
    })
    .strict(),
]);

export type VisionResponseErrorCode =
  | "INVALID_MODEL_JSON"
  | "INVALID_MODEL_SCHEMA";

export class VisionResponseError extends Error {
  constructor(
    public readonly code: VisionResponseErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "VisionResponseError";
  }
}

function isPlausibleIsoDate(value: string | null): boolean {
  if (value === null) {
    return true;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    year < 1900 ||
    year > 2100
  ) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function fieldsHavePlausibleDates(fields: CinFields): boolean {
  return (
    isPlausibleIsoDate(fields.dateNaissance) &&
    isPlausibleIsoDate(fields.dateFinValidite)
  );
}

/**
 * Convertit la réponse texte d'un modèle de vision en contrat applicatif sûr.
 * Toute réponse malformée, inattendue ou incohérente est rejetée explicitement.
 */
export function parseVisionResponse(modelText: string): CinAnalysis {
  let candidate: unknown;

  try {
    candidate = JSON.parse(modelText) as unknown;
  } catch {
    throw new VisionResponseError(
      "INVALID_MODEL_JSON",
      "Le modèle de vision n'a pas retourné un JSON valide.",
    );
  }

  const parsed = rawVisionResponseSchema.safeParse(candidate);

  if (!parsed.success) {
    throw new VisionResponseError(
      "INVALID_MODEL_SCHEMA",
      "Le JSON retourné par le modèle ne respecte pas le contrat attendu.",
    );
  }

  if (
    parsed.data.classification === "cin" &&
    !fieldsHavePlausibleDates(parsed.data.fields)
  ) {
    throw new VisionResponseError(
      "INVALID_MODEL_SCHEMA",
      "Le JSON retourné par le modèle contient une date impossible ou non plausible.",
    );
  }

  if (parsed.data.classification === "cin") {
    return {
      status: "success",
      engineVersion: OCR_ENGINE_VERSION,
      fields: parsed.data.fields,
    };
  }

  return {
    status: parsed.data.classification,
    engineVersion: OCR_ENGINE_VERSION,
    fields: parsed.data.fields,
  };
}
