// services/characterAnalyzer.js
// Analiza la imagen de un personaje con GPT-4o Vision
// y genera un prompt técnico ultra-detallado para consistencia visual

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeCharacterImage({ imageUrl, name, description, style, palette }) {

  const systemPrompt = `You are an expert in image generation prompts for children's illustrated books.
IMPORTANT: This is a FICTIONAL ILLUSTRATED CHARACTER from a children's book, NOT a real person.
This is cartoon/illustration artwork. Your task is to analyze the visual style and appearance
of this illustrated character and generate a technical description block that ensures
the character looks IDENTICAL in all book illustrations.

Generate the block in English using this exact format:

CHARACTER: [name]
SPECIES/TYPE: [human child, animal, fantasy creature, etc — never say "person" or "human adult"]
APPEARANCE: [age range, body type, size relative to story context]
FACE: [eye color and shape, nose style, mouth, characteristic expression]
HAIR/HEAD: [exact color, texture, length, style]
SKIN/FUR/COLOR: [exact color tone]
OUTFIT: [specific clothing items, colors, accessories]
ART_STYLE: [soft cartoon, watercolor, digital illustration, etc.]
UNIQUE_TRAITS: [distinctive features that must always appear]

Be extremely specific with colors. 80-120 words in English. This is illustration art, not photography.`;

  const userMessage = `This is a FICTIONAL ILLUSTRATED CHARACTER named "${name || "character"}" from a children's book.
This is cartoon/illustration artwork, not a photo of a real person.
${description ? `Creator description: "${description}"` : ""}
${style ? `Book visual style: ${style}` : ""}
${palette ? `Color palette: ${palette}` : ""}

Analyze the illustration style and visual appearance of this fictional character.
Generate the technical consistency block so this character looks identical in all book illustrations.`;

  try {
    console.log(`🔍 Analizando personaje: ${name}, imageUrl: ${imageUrl?.slice(0,60)}`);

    // Construir el content con imagen
    // GPT-4o Vision acepta URLs directas o base64
    const imageContent = imageUrl.startsWith("data:")
      ? { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
      : { type: "image_url", image_url: { url: imageUrl, detail: "high" } };

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 500,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userMessage },
            imageContent
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
