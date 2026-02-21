// services/editorialOrchestrator.js

import { getMaxWords, getStyleHints } from "./textConstraints.js";
import { buildPrompt } from "./promptBuilder.js";
import { cleanText, enforceSingleBlock, countWords } from "./textPostprocess.js";
import { generateText } from "./openaiText.js";

export async function generatePageText({ page, story, settings, brain, pages }) {

  // =========================
  // 🔒 VALIDACIÓN DE CONTRATO
  // =========================

  if (!settings || typeof settings !== "object") {
    throw new Error("Invalid settings object in generatePageText");
  }

  if (!page || typeof page !== "object") {
    throw new Error("Invalid page object in generatePageText");
  }

  if (!Array.isArray(pages)) {
    throw new Error("Invalid pages array in generatePageText");
  }

  const pageType = page.type;
  const ageTarget = settings.ageTarget;

  // =============================
  // 🧠 COHERENCIA GLOBAL REAL
  // =============================

  let previousPageText = "";
  let nextPageGoal = "";

  // Ordenar páginas por orden real
  const orderedPages = [...pages].sort((a, b) => a.order - b.order);

  // Encontrar índice actual
  const currentIndex = orderedPages.findIndex(p => p.id === page.id);

  // Texto anterior REAL
  if (currentIndex > 0) {
    previousPageText = orderedPages[currentIndex - 1]?.text || "";
  }

    // Definir objetivo narrativo según posición
    if (pageType === "story" && story) {

      const storyPages = orderedPages.filter(p => p.storyId === story.id && p.type === "story");

      const storyIndex = storyPages.findIndex(p => p.id === page.id);

    if (storyIndex === 0) {
      nextPageGoal = "Introducir situación emocional inicial.";
    } else if (storyIndex === storyPages.length - 1) {
      nextPageGoal = "Resolver conflicto emocional con cierre positivo.";
    } else {
      nextPageGoal = "Desarrollar conflicto y avance emocional.";
    }
  }

  // =========================
  // 2️⃣ LIMITES EDITORIALES
  // =========================

  const maxWords = getMaxWords({ pageType, ageTarget });
  const styleHints = getStyleHints({ pageType, ageTarget });

  // =========================
  // 3️⃣ CONSTRUIR CONTEXTO
  // =========================

  const context = {
    pageType,
    pageNumber: page.pageNumber,
    storyTitle: story?.title,
    theme: story?.theme,
    lesson: story?.theme,
    characters: settings.characters || [],
    bookTitle: settings.bookTitle,
    ageTarget,
    previousPageText,
    nextPageGoal
  };

  // =========================
  // 4️⃣ PROMPT
  // =========================

  const prompt = buildPrompt({
    brain,
    page,
    context,
    maxWords,
    styleHints
  });

  let text = await generateText(prompt);

  text = enforceSingleBlock(cleanText(text));

  // =========================
  // 5️⃣ VALIDACIÓN + RETRIES
  // =========================

  const maxRetries = 2;

  for (let i = 0; i < maxRetries; i++) {
    const words = countWords(text);
    if (words <= maxWords) break;

    const tightenPrompt = `
Recorta el siguiente texto a máximo ${maxWords} palabras.
Mantén sentido y tono infantil.
Devuelve SOLO el texto final:

"${text}"
`.trim();

    text = await generateText(tightenPrompt);
    text = enforceSingleBlock(cleanText(text));
  }

  return {
    text,
    pageType,
    maxWords,
    words: countWords(text)
  };
}
