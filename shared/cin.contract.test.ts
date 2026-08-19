import { describe, expect, it } from "vitest";
import {
  cinAnalysisSchema,
  cinFieldsSchema,
  emptyCinFields,
} from "./cin.contract";

describe("cin.contract", () => {
  it("accepte les cinq champs structurés dans un résultat success", () => {
    const result = cinAnalysisSchema.safeParse({
      status: "success",
      engineVersion: "ocr-v1",
      fields: {
        nom: "EL AMRANI",
        prénom: "DOUNIA",
        dateNaissance: "1998-08-04",
        numeroCIN: "AB123456",
        dateFinValidite: "2030-05-18",
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepte l’état not-cin uniquement avec cinq valeurs null", () => {
    const result = cinAnalysisSchema.safeParse({
      status: "not-cin",
      engineVersion: "ocr-v1",
      fields: emptyCinFields(),
    });

    expect(result.success).toBe(true);
  });

  it("rejette un numéro CIN hors du format autorisé", () => {
    const result = cinFieldsSchema.safeParse({
      nom: "TEST",
      prénom: "TEST",
      dateNaissance: "2000-01-01",
      numeroCIN: "NUMERO-INVENTE",
      dateFinValidite: "2030-01-01",
    });

    expect(result.success).toBe(false);
  });

  it("rejette une clé inattendue dans les champs OCR", () => {
    const result = cinFieldsSchema.safeParse({
      nom: null,
      prénom: null,
      dateNaissance: null,
      numeroCIN: null,
      dateFinValidite: null,
      confiance: 99,
    });

    expect(result.success).toBe(false);
  });

  it("exige un code d’erreur sûr pour l’état error", () => {
    const result = cinAnalysisSchema.safeParse({
      status: "error",
      engineVersion: "ocr-v1",
      fields: emptyCinFields(),
      code: "OCR_UNAVAILABLE",
    });

    expect(result.success).toBe(true);
  });
});
