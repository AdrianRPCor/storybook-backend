// services/openaiImage.js
// Genera imágenes usando la API de Genspark o OpenAI
// Maneja tanto URL directa como b64_json

import OpenAI from "openai";
import fs from "fs";
import yaml from "js-yaml";
import os from "os";
import path from "path";

function getClient() {
  try {
    const configPath = path.join(os.homedir(), ".genspark_llm.yaml");
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf8");
      const cfg = yaml.load(raw);
      let rawKey = cfg?.openai?.api_key || "";
      rawKey = rawKey.replace(/\$\{([^}]+)\}/g, (_, varName) => process.env[varName] || "");
      const baseURL = cfg?.openai?.base_url;
      if (rawKey && baseURL) {
        return new OpenAI({ apiKey: rawKey, baseURL });
      }
    }
  } catch (_) {}

  const baseURL = process.env.OPENAI_BASE_URL;
  const apiKey  = process.env.OPENAI_API_KEY;

  if (!apiKey) throw new Error("No hay API key disponible para imágenes");
  if (baseURL) return new OpenAI({ apiKey, baseURL });
  return new OpenAI({ apiKey });
}

export async function generateImage(prompt, coloring = false) {
  const client = getClient();

  const finalPrompt = coloring
    ? `Libro para colorear infantil, líneas negras limpias, sin relleno de color, fondo blanco. ${prompt}`
    : prompt;

  // Intentar con gpt-image-1, fallback a dall-e-3, luego dall-e-2
  const models = ["gpt-image-1", "dall-e-3", "dall-e-2"];

  for (const model of models) {
    try {
      const params = {
        model,
        prompt: finalPrompt,
        n: 1,
        size: "1024x1024",
      };

      // dall-e-3 no acepta b64_json response_format directamente
      if (model === "dall-e-3") {
        params.response_format = "url";
      } else if (model === "gpt-image-1") {
        // gpt-image-1 devuelve b64_json por defecto
      } else {
        params.response_format = "b64_json";
      }

      const result = await client.images.generate(params);
      const item = result.data[0];

      console.log(`✅ Imagen generada con modelo: ${model}`);

      // Caso A: URL directa
      if (item.url) return item.url;

      // Caso B: b64_json → data URL
      if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;

      throw new Error("La API no devolvió ni url ni b64_json");

    } catch (e) {
      if (e.status === 401 || e.status === 403 || e.status === 404 || e.message?.includes("model")) {
        console.warn(`⚠️ Modelo imagen ${model} no disponible, probando siguiente...`);
        continue;
      }
      throw e;
    }
  }

  throw new Error("No se pudo generar imagen con ningún modelo disponible");
}
