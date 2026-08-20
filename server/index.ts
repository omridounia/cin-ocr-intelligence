import { createApp } from "./app";

const rawPort = process.env["PORT"];
const port = rawPort ? Number(rawPort) : Number.NaN;

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error(
    "La variable d’environnement PORT doit contenir un port valide pour démarrer l’API.",
  );
}

createApp().listen(port, () => {
  console.log(`API CIN OCR disponible sur http://127.0.0.1:${port}` );
});
