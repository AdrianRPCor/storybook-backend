// services/editorialOrchestrator.js

import { getMaxWords, getStyleHints } from "./textConstraints.js";
import { buildPrompt } from "./promptBuilder.js";
import { cleanText, enforceSingleBlock, countWords } from "./textPostprocess.js";
import { generateText } from "./openaiText.js";

export async function generatePageText({
  page,
  story,
  settings,
  brain,
  pages,
  characters
}) {

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
  // 🧠 COHERENCIA NARRATIVA REAL
  // =============================

  let previousPageText = "";
  let nextPageGoal = "";

  const orderedPages = [...pages].sort((a, b) => a.order - b.order);

  const currentIndex = orderedPages.findIndex(p => p.id === page.id);

  // 🔹 Coherencia SOLO dentro del mismo cuento
  if (pageType === "story" && story) {

    const storyPages = orderedPages.filter(
      p => p.storyId === story.id && p.type === "story"
    );

    const storyIndex = storyPages.findIndex(p => p.id === page.id);

    if (storyIndex > 0) {
      previousPageText = storyPages[storyIndex - 1]?.text || "";
    }

    if (storyIndex === 0) {
      nextPageGoal = "Introducir situación emocional inicial.";
    } else if (storyIndex === storyPages.length - 1) {
      nextPageGoal = "Resolver conflicto emocional con cierre positivo.";
    } else {
      nextPageGoal = "Desarrollar conflicto y avance emocional.";
    }
  }

  // =========================
  // 📏 LIMITES EDITORIALES
  // =========================

  const maxWords = getMaxWords({ pageType, ageTarget });
  const styleHints = getStyleHints({ pageType, ageTarget });

  // =========================
  // 🧱 CONTEXTO GLOBAL
  // =========================

  const context = {
    pageType,
    pageNumber: page.pageNumber,
    storyTitle: story?.title,
    storyIndex: story?.index,
    theme: story?.theme,
    lesson: story?.theme,
    characters: characters || [],
    bookTitle: settings.bookTitle,
    bookSubtitle: settings.bookSubtitle,
    storyTitles: settings.storyTitles || [],
    ageTarget,
    previousPageText,
    nextPageGoal
  };

  // =========================
  // 🧠 CONSTRUIR PROMPT
  // =========================

  const prompt = buildPrompt({
    brain,
    context,
    maxWords,
    styleHints
  });

  let text = await generateText(prompt);

  text = enforceSingleBlock(cleanText(text));

  // =========================
  // 🔁 CONTROL DE LONGITUD
  // =========================

  const maxRetries = 2;

  for (let i = 0; i < maxRetries; i++) {

    const words = countWords(text);
    if (words <= maxWords) break;

    const tightenPrompt = `
Recorta el siguiente texto a máximo ${maxWords} palabras.
Mantén coherencia narrativa y tono infantil.
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
