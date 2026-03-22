// services/openaiImage.js
// Genera imágenes usando la API de Genspark o OpenAI
// Maneja tanto URL directa como b64_json

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateImage(prompt, coloring = false) {

  if (!prompt || typeof prompt !== "string") {
    throw new Error("Prompt inválido en generateImage");
  }

  const finalPrompt = coloring
    ? `Ilustración infantil para libro para colorear, líneas negras limpias, sin relleno de color, fondo blanco. ${prompt}`
    : `Ilustración infantil estilo cuento, suave, amigable, colores cálidos, coherente entre escenas. ${prompt}`;

  try {
    console.log("🎨 Generando imagen...");

    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt: finalPrompt,
      size: "1024x1024"
    });

    const image = result?.data?.[0];

    if (!image) {
      throw new Error("Respuesta inválida de la API de imágenes");
    }

    // Caso URL directa
    if (image.url) {
      return image.url;
    }

    // Caso base64
    if (image.b64_json) {
      return `data:image/png;base64,${image.b64_json}`;
    }

    throw new Error("La imagen no contiene url ni base64");

  } catch (error) {
    console.error("❌ Error generando imagen:", error.message);
    throw error;
  }
}
