import { describe, expect, it } from "vitest";
import {
  buildCinExtractionPrompt,
  CIN_VISION_MODEL,
  CIN_VISION_PROMPT_VERSION,
} from "./cin.prompt";

describe("cin.prompt", () => {
  it("versionne explicitement le prompt et le modèle local retenu", () => {
    expect(CIN_VISION_PROMPT_VERSION).toBe("cin-v1");
    expect(CIN_VISION_MODEL).toBe("qwen2.5vl:3b");
  });

  it("impose le périmètre latin et l'absence d'invention", () => {
    const prompt = buildCinExtractionPrompt();

    expect(prompt).toContain("caractères latins");
    expect(prompt).toContain("Ignore totalement l'arabe");
    expect(prompt).toContain("n'invente aucune information");
    expect(prompt).toContain("retourne la valeur null");
  });

  it("impose un JSON strict, les cinq champs et les états d'échec", () => {
    const prompt = buildCinExtractionPrompt();

    expect(prompt).toContain("Réponds uniquement avec un objet JSON valide");
    expect(prompt).toContain('"nom"');
    expect(prompt).toContain('"prénom"');
    expect(prompt).toContain('"dateNaissance"');
    expect(prompt).toContain('"numeroCIN"');
    expect(prompt).toContain('"dateFinValidite"');
    expect(prompt).toContain('"not-cin"');
    expect(prompt).toContain('"unreadable"');
  });
});
