// services/characterAnalyzer.js
// Analiza la imagen de un personaje con GPT-4o Vision
// y genera un prompt técnico ultra-detallado para consistencia visual

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeCharacterImage({ imageUrl, name, description, style, palette }) {

  const systemPrompt = `Eres un experto en prompts de generación de imágenes para libros infantiles.
Tu tarea es analizar la imagen de un personaje y generar un bloque de descripción técnica
ultra-detallado que garantice que el personaje sea IDÉNTICO en todas las ilustraciones del libro.

El bloque debe ser en inglés (mejor rendimiento con modelos de imagen) y seguir este formato exacto:

CHARACTER: [nombre]
APPEARANCE: [descripción completa: especie/tipo, edad aparente, género, complexión]
FACE: [forma de cara, ojos (color, forma, tamaño), nariz, boca, expresión característica]
HAIR/HEAD: [color, textura, longitud, estilo, orejas si son visibles]
SKIN/FUR/COLOR: [tono de piel o color de pelaje/cuerpo exacto]
OUTFIT: [ropa específica: colores, prendas, accesorios habituales]
STYLE: [estilo de ilustración: cartoon suave, acuarela, etc.]
CONSISTENCY NOTES: [rasgos únicos que deben mantenerse siempre]

Sé extremadamente específico con los colores (usa nombres de color precisos).
El bloque debe tener entre 80-120 palabras en inglés.`;

  const userMessage = `Analiza esta imagen del personaje "${name || "personaje"}" y genera el bloque de descripción técnica.
${description ? `Descripción del creador: "${description}"` : ""}
${style ? `Estilo visual del libro: ${style}` : ""}
${palette ? `Paleta de color: ${palette}` : ""}

Genera el bloque técnico en inglés para que este personaje sea siempre idéntico en todas las ilustraciones.`;

  try {
    console.log(`🔍 Analizando personaje: ${name}`);

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 400,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userMessage },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ]
        }
      ]
    });

    const promptText = response.choices?.[0]?.message?.content?.trim() || "";
    console.log(`✅ Prompt técnico generado para ${name}: ${promptText.slice(0, 80)}...`);
    return { promptDescription: promptText };

  } catch (error) {
    console.error("❌ Error analizando personaje:", error.message);
    throw new Error(`Error al analizar imagen del personaje: ${error.message}`);
  }
}

export async function generateCharacterPromptFromDescription({ name, description, style, palette }) {
  // Versión sin imagen — genera el prompt solo desde la descripción de texto
  const systemPrompt = `Eres un experto en prompts de generación de imágenes para libros infantiles.
Genera un bloque técnico en inglés para que un personaje sea IDÉNTICO en todas las ilustraciones.

Formato obligatorio:
CHARACTER: [nombre]
APPEARANCE: [especie/tipo, edad, género, complexión]
FACE: [ojos, nariz, boca, expresión]
HAIR/HEAD: [color exacto, estilo]
SKIN/FUR/COLOR: [tono exacto]
OUTFIT: [ropa y accesorios habituales]
STYLE: [${style || "soft cartoon, children book illustration"}]
CONSISTENCY NOTES: [rasgos únicos identificativos]

80-120 palabras en inglés. Colores muy específicos.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 300,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Personaje: ${name}. Descripción: ${description}. Estilo: ${style}. Paleta: ${palette}.` }
    ]
  });

  return { promptDescription: response.choices?.[0]?.message?.content?.trim() || "" };
}
