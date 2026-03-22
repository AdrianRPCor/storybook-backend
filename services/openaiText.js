// services/openaiText.js
// Usa la API de Genspark (compatible con OpenAI SDK)
// Fallback: OPENAI_API_KEY si Genspark no está disponible

import OpenAI from "openai";
import fs from "fs";
import yaml from "js-yaml";
import os from "os";
import path from "path";

function getClient() {
  // 1. Leer ~/.genspark_llm.yaml y resolver variable de entorno embebida
  try {
    const configPath = path.join(os.homedir(), ".genspark_llm.yaml");
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf8");
      const cfg = yaml.load(raw);
      let rawKey = cfg?.openai?.api_key || "";
      // Resolver ${VAR} dentro del yaml
      rawKey = rawKey.replace(/\$\{([^}]+)\}/g, (_, varName) => process.env[varName] || "");
      const baseURL = cfg?.openai?.base_url;
      if (rawKey && baseURL) {
        return new OpenAI({ apiKey: rawKey, baseURL });
      }
    }
  } catch (_) {}

  // 2. Variables de entorno directas
  const baseURL = process.env.OPENAI_BASE_URL;
  const apiKey  = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("No hay API key disponible. Configura OPENAI_API_KEY en el archivo .env");
  }

  if (baseURL) {
    return new OpenAI({ apiKey, baseURL });
  }

  return new OpenAI({ apiKey });
}

export async function generateText(prompt) {
  const client = getClient();

  // Intentar con modelo Genspark, fallback a gpt-4o-mini si falla
  const models = ["gpt-5-mini", "gpt-4o-mini", "gpt-4.1-mini", "gpt-3.5-turbo"];

  for (const model of models) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
        temperature: 0.8,
      });
      console.log(`✅ Texto generado con modelo: ${model}`);
      return response.choices[0].message.content.trim();
    } catch (e) {
      // Si es 401/403 o modelo no encontrado, intentar el siguiente
      if (e.status === 401 || e.status === 403 || e.status === 404 || e.message?.includes("model")) {
        console.warn(`⚠️ Modelo ${model} no disponible, probando siguiente...`);
        continue;
      }
      throw e;
    }
  }

  throw new Error("No se pudo generar texto con ningún modelo disponible");
}
