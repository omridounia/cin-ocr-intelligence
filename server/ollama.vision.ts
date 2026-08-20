import { buildCinExtractionPrompt, CIN_VISION_MODEL } from "./cin.prompt";

const OLLAMA_CHAT_URL =
  process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/api/chat";

export type OllamaVisionErrorCode =
  | "OLLAMA_UNAVAILABLE"
  | "OLLAMA_REQUEST_FAILED"
  | "OLLAMA_INVALID_RESPONSE";

export class OllamaVisionError extends Error {
  constructor(
    public readonly code: OllamaVisionErrorCode,
    message: string,
   ) {
    super(message);
    this.name = "OllamaVisionError";
  }
}

interface OllamaChatResponse {
  message: {
    content: string;
  };
}

function isOllamaChatResponse(value: unknown): value is OllamaChatResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const message = record["message"];

  if (!message || typeof message !== "object") {
    return false;
  }

  const messageRecord = message as Record<string, unknown>;
  return typeof messageRecord["content"] === "string";
}

/**
 * Envoie une image au modèle Qwen2.5-VL exécuté localement par Ollama.
 * La sortie n'est pas encore considérée comme fiable : elle sera parsée puis
 * validée par Zod dans le module d'orchestration suivant.
 */
export async function analyzeImageWithLocalVision(
  imageBuffer: Buffer,
): Promise<string> {
  const imageBase64 = imageBuffer.toString("base64");

  let response: Response;

  try {
    response = await fetch(OLLAMA_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CIN_VISION_MODEL,
        stream: false,
        format: "json",
        messages: [
          {
            role: "user",
            content: buildCinExtractionPrompt(),
            images: [imageBase64],
          },
        ],
      }),
    });
  } catch {
    throw new OllamaVisionError(
      "OLLAMA_UNAVAILABLE",
      "Le moteur de vision local est indisponible.",
    );
  }

  if (!response.ok) {
    throw new OllamaVisionError(
      "OLLAMA_REQUEST_FAILED",
      "Le moteur de vision local a refusé l'analyse de l'image.",
    );
  }

  let payload: unknown;

  try {
    payload = (await response.json()) as unknown;
  } catch {
    throw new OllamaVisionError(
      "OLLAMA_INVALID_RESPONSE",
      "Le moteur de vision local a retourné une réponse non exploitable.",
    );
  }

  if (!isOllamaChatResponse(payload) || payload.message.content.trim() === "") {
    throw new OllamaVisionError(
      "OLLAMA_INVALID_RESPONSE",
      "Le moteur de vision local a retourné une réponse non exploitable.",
    );
  }

  return payload.message.content;
}
