// services/editorialOrchestrator.js

import { getMaxWords, getStyleHints } from "./textConstraints.js";
import { buildPrompt } from "./promptBuilder.js";
import { cleanText, enforceSingleBlock, countWords } from "./textPostprocess.js";

// ✅ Ajusta esta importación a tu proyecto real.
// Si ya tienes services/openaiText.js, úsalo aquí.
import { generateText } from "./openaiText.js";

export async function generatePageText({ brain, page, context }) {
  const pageType = context.pageType;

  const maxWords = getMaxWords({ pageType, ageTarget: context.ageTarget });
  const styleHints = getStyleHints({ pageType, ageTarget: context.ageTarget });

  const basePrompt = buildPrompt({
    brain,
    page,
    context,
    maxWords,
    styleHints,
    previousPageText: context.previousPageText || "",
    nextPageGoal: context.nextPageGoal || ""
  });

  // 1) Primer intento
  let text = await generateText(basePrompt);

  // Postproceso
  text = enforceSingleBlock(cleanText(text));

  // 2) Validación de palabras + retries si se pasa
  const maxRetries = 2;
  for (let i = 0; i < maxRetries; i++) {
    const words = countWords(text);
    if (words <= maxWords) break;

    const tightenPrompt = `
Recorta el siguiente texto a máximo ${maxWords} palabras.
Mantén sentido, tono infantil y coherencia. No añadas nada nuevo.
Devuelve SOLO el texto final:

"${text}"
`.trim();

    text = await generateText(tightenPrompt);
    text = enforceSingleBlock(cleanText(text));
  }

  return { text, maxWords, words: countWords(text) };
}
