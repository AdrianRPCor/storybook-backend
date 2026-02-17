// services/editorialOrchestrator.js

import { getMaxWords, getStyleHints } from "./textConstraints.js";
import { buildPrompt } from "./promptBuilder.js";
import { cleanText, enforceSingleBlock, countWords } from "./textPostprocess.js";
import { generateText } from "./openaiText.js";

export async function generatePageText({ page, story, settings, brain }) {

  const pageType = page.type;
  const ageTarget = settings.ageTarget;

  // =========================
  // 1️⃣ CONTEXTO NARRATIVO REAL
  // =========================

  let previousPageText = "";
  let nextPageGoal = "";

  if (story && pageType === "story") {

    const storyPages = story.pages || [];

    const index = storyPages.findIndex(id => id === page.id);

    if (index > 0) {
      previousPageText = storyPages[index - 1];
    }

    const total = storyPages.length;

    if (index === 0) nextPageGoal = "Presentar situación inicial emocional.";
    else if (index === total - 1) nextPageGoal = "Cerrar conflicto emocional.";
    else nextPageGoal = "Desarrollar conflicto y avance emocional.";
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
