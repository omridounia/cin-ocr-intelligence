import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "./app";
import { analyzeCinUpload } from "./cin.analysis";

vi.mock("./cin.analysis", () => ({
  analyzeCinUpload: vi.fn(),
}));

const analyzeCinUploadMock = vi.mocked(analyzeCinUpload);

const validInput = {
  fileName: "specimen-fictif.png",
  mimeType: "image/png",
  size: 12,
  dataUrl: "data:image/png;base64,iVBORw0KGgo=",
};

afterEach(() => {
  vi.resetAllMocks();
});

describe("API CIN", () => {
  it("expose un endpoint de santé", async () => {
    const response = await request(createApp()).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("délègue l’analyse au module métier et retourne un résultat success", async () => {
    analyzeCinUploadMock.mockResolvedValue({
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

    const response = await request(createApp())
      .post("/api/analyze")
      .send(validInput);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("success");
    expect(analyzeCinUploadMock).toHaveBeenCalledWith(validInput);
  });

  it("retourne 400 lorsque le fichier est rejeté", async () => {
    analyzeCinUploadMock.mockResolvedValue({
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

    const response = await request(createApp())
      .post("/api/analyze")
      .send(validInput);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("FILE_REJECTED");
  });

  it("retourne 503 lorsque le moteur local est indisponible", async () => {
    analyzeCinUploadMock.mockResolvedValue({
      status: "error",
      engineVersion: "ocr-v1",
      fields: {
        nom: null,
        prénom: null,
        dateNaissance: null,
        numeroCIN: null,
        dateFinValidite: null,
      },
      code: "OCR_UNAVAILABLE",
    });

    const response = await request(createApp())
      .post("/api/analyze")
      .send(validInput);

    expect(response.status).toBe(503);
    expect(response.body.code).toBe("OCR_UNAVAILABLE");
  });

  it("rejette un JSON HTTP malformé sans appeler l’analyse métier", async () => {
    const response = await request(createApp())
      .post("/api/analyze")
      .set("Content-Type", "application/json")
      .send("{");

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("FILE_REJECTED");
    expect(analyzeCinUploadMock).not.toHaveBeenCalled();
  });
});
