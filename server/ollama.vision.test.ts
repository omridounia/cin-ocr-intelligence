import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeImageWithLocalVision } from "./ollama.vision";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ollama.vision", () => {
  it("envoie l'image en base64, le prompt et le modèle local à Ollama", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            content: '{"classification":"cin","fields":{"nom":null,"prénom":null,"dateNaissance":null,"numeroCIN":null,"dateFinValidite":null}}',
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      analyzeImageWithLocalVision(Buffer.from("image-fictive")),
    ).resolves.toContain('"classification":"cin"');

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(request.body)) as {
      model: string;
      stream: boolean;
      format: string;
      messages: Array<{
        content: string;
        images: string[];
      }>;
    };

    expect(body.model).toBe("qwen2.5vl:3b");
    expect(body.stream).toBe(false);
    expect(body.format).toBe("json");
    expect(body.messages[0]?.images).toEqual([
      Buffer.from("image-fictive").toString("base64"),
    ]);
    expect(body.messages[0]?.content).toContain("caractères latins");
  });

  it("retourne une erreur sûre lorsque le moteur local est indisponible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(
      analyzeImageWithLocalVision(Buffer.from("image-fictive")),
    ).rejects.toMatchObject({
      code: "OLLAMA_UNAVAILABLE",
    });
  });

  it("rejette une réponse Ollama malformée", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: { content: 42 } }), {
          status: 200,
        }),
      ),
    );

    await expect(
      analyzeImageWithLocalVision(Buffer.from("image-fictive")),
    ).rejects.toMatchObject({
      code: "OLLAMA_INVALID_RESPONSE",
    });
  });
});
