import { describe, expect, it } from "vitest";
import {
  parseVisionResponse,
  VisionResponseError,
} from "./vision.response";

function expectVisionResponseError(
  callback: () => unknown,
  expectedCode: "INVALID_MODEL_JSON" | "INVALID_MODEL_SCHEMA",
): void {
  expect.assertions(2);

  try {
    callback();
  } catch (error) {
    expect(error).toBeInstanceOf(VisionResponseError);
    expect((error as VisionResponseError).code).toBe(expectedCode);
  }
}

describe("vision.response", () => {
  it("accepte une CIN valide et la transforme en résultat success", () => {
    const result = parseVisionResponse(
      JSON.stringify({
        classification: "cin",
        fields: {
          nom: "TESTEUR",
          prénom: "AMINA",
          dateNaissance: "2000-01-01",
          numeroCIN: "ZZ000000",
          dateFinValidite: "2030-12-31",
        },
      }),
    );

    expect(result).toEqual({
      status: "success",
      engineVersion: "ocr-v1",
      fields: {
        nom: "TESTEUR",
        prénom: "AMINA",
        dateNaissance: "2000-01-01",
        numeroCIN: "ZZ000000",
        dateFinValidite: "2030-12-31",
      },
    });
  });

  it("mappe un document non-CIN vers not-cin avec cinq valeurs null", () => {
    const result = parseVisionResponse(
      JSON.stringify({
        classification: "not-cin",
        fields: {
          nom: null,
          prénom: null,
          dateNaissance: null,
          numeroCIN: null,
          dateFinValidite: null,
        },
      }),
    );

    expect(result.status).toBe("not-cin");
    expect(result.fields).toEqual({
      nom: null,
      prénom: null,
      dateNaissance: null,
      numeroCIN: null,
      dateFinValidite: null,
    });
  });

  it("mappe une image illisible vers unreadable avec cinq valeurs null", () => {
    const result = parseVisionResponse(
      JSON.stringify({
        classification: "unreadable",
        fields: {
          nom: null,
          prénom: null,
          dateNaissance: null,
          numeroCIN: null,
          dateFinValidite: null,
        },
      }),
    );

    expect(result.status).toBe("unreadable");
  });

  it("rejette une réponse qui n'est pas du JSON", () => {
    expectVisionResponseError(
      () => parseVisionResponse("ceci n'est pas du JSON"),
      "INVALID_MODEL_JSON",
    );
  });

  it("rejette une date impossible malgré un format ISO apparent", () => {
    expectVisionResponseError(
      () =>
        parseVisionResponse(
          JSON.stringify({
            classification: "cin",
            fields: {
              nom: "TESTEUR",
              prénom: "AMINA",
              dateNaissance: "2000-02-30",
              numeroCIN: "ZZ000000",
              dateFinValidite: "2030-12-31",
            },
          }),
        ),
      "INVALID_MODEL_SCHEMA",
    );
  });

  it("rejette une clé inattendue dans la réponse du modèle", () => {
    expectVisionResponseError(
      () =>
        parseVisionResponse(
          JSON.stringify({
            classification: "not-cin",
            fields: {
              nom: null,
              prénom: null,
              dateNaissance: null,
              numeroCIN: null,
              dateFinValidite: null,
            },
            confidence: 100,
          }),
        ),
      "INVALID_MODEL_SCHEMA",
    );
  });
});
