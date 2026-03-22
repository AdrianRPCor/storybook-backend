// services/openaiText.js
// Usa la API de Genspark (compatible con OpenAI SDK)
// Fallback: OPENAI_API_KEY si Genspark no está disponible

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateText(prompt) {

  if (!prompt || typeof prompt !== "string") {
    throw new Error("Prompt inválido en generateText");
  }

  const models = ["gpt-4o-mini"];

  for (const model of models) {
    try {
      console.log(`🧠 Generando texto con modelo: ${model}`);

      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1024,
        temperature: 0.8,
      });

      const text = response?.choices?.[0]?.message?.content;

      if (!text) {
        throw new Error("Respuesta vacía del modelo");
      }

      return text.trim();

    } catch (error) {
      console.warn(`⚠️ Error con modelo ${model}:`, error.message);
      continue;
    }
  }

  throw new Error("❌ No se pudo generar texto con ningún modelo");
}
