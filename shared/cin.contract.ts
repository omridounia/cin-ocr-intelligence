import { z } from "zod";

export const OCR_ENGINE_VERSION = "ocr-v1" as const;

export const CIN_FIELD_NAMES = [
  "nom",
  "prénom",
  "dateNaissance",
  "numeroCIN",
  "dateFinValidite",
] as const;

export type CinFieldName = (typeof CIN_FIELD_NAMES)[number];

const nullableTextSchema = z.string().trim().min(1).max(120).nullable();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const cinNumberSchema = z.string().regex(/^[A-Z]{1,2}\d{4,8}$/).nullable();

export const cinFieldsSchema = z.object({
  nom: nullableTextSchema,
  prénom: nullableTextSchema,
  dateNaissance: isoDateSchema,
  numeroCIN: cinNumberSchema,
  dateFinValidite: isoDateSchema,
}).strict();

export const emptyCinFieldsSchema = z.object({
  nom: z.null(),
  prénom: z.null(),
  dateNaissance: z.null(),
  numeroCIN: z.null(),
  dateFinValidite: z.null(),
}).strict();

export const safeErrorCodeSchema = z.enum([
  "FILE_REJECTED",
  "OCR_UNAVAILABLE",
  "INTERNAL_ERROR",
]);

const analysisMetadataSchema = z.object({
  engineVersion: z.literal(OCR_ENGINE_VERSION),
}).strict();

export const cinAnalysisSchema = z.discriminatedUnion("status", [
  analysisMetadataSchema.extend({
    status: z.literal("success"),
    fields: cinFieldsSchema,
  }),
  analysisMetadataSchema.extend({
    status: z.literal("not-cin"),
    fields: emptyCinFieldsSchema,
  }),
  analysisMetadataSchema.extend({
    status: z.literal("unreadable"),
    fields: emptyCinFieldsSchema,
  }),
  analysisMetadataSchema.extend({
    status: z.literal("error"),
    fields: emptyCinFieldsSchema,
    code: safeErrorCodeSchema,
  }),
]);

export type CinFields = z.infer<typeof cinFieldsSchema>;
export type CinAnalysis = z.infer<typeof cinAnalysisSchema>;

export function emptyCinFields(): z.infer<typeof emptyCinFieldsSchema> {
  return {
    nom: null,
    prénom: null,
    dateNaissance: null,
    numeroCIN: null,
    dateFinValidite: null,
  };
}
