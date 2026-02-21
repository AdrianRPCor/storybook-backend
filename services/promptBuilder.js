export function buildPrompt({
  brain,
  context,
  maxWords,
  styleHints
}) {

  const {
    pageType,
    pageNumber,
    storyTitle,
    storyIndex,
    theme,
    lesson,
    characters = [],
    bookTitle,
    bookSubtitle,
    storyTitles = [],
    previousPageText,
    nextPageGoal,
    ageTarget
  } = context;

  const chars = characters.length
    ? characters.map(c =>
        `- ${c.name || "Personaje"}: ${c.description || ""}`
      ).join("\n")
    : "- Usa solo los personajes necesarios y mantenlos coherentes.";

  const instructionByType = {

    cover: `
Escribe:
1) TÍTULO (máximo 8 palabras)
2) SUBTÍTULO (máximo 12 palabras)
3) Texto breve de contraportada (máximo 80 palabras)

Debe reflejar las temáticas del libro.
`.trim(),

    "story-cover": `
Escribe SOLO el título del cuento "${storyTitle}".
Máximo 8 palabras.
Debe reflejar la enseñanza: ${lesson}.
`.trim(),

    index: `
Escribe un índice estructurado usando EXACTAMENTE estos títulos:

${storyTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Después añade:
- Página final emocional
- Guía para adultos
- Sobre la ONG

No inventes títulos nuevos.
`.trim(),

    story: `
Continúa el cuento "${storyTitle}".

Reglas:
- No reinicies la historia.
- No repitas información.
- Avanza la narrativa.
- Objetivo de esta página: ${nextPageGoal}

Texto anterior:
"${previousPageText || ""}"
`.trim(),

    closing: `
Escribe una página final emocional para cerrar todo el libro.
Debe transmitir seguridad, crecimiento y calma.
No repitas cuentos.
`.trim(),

    "adult-guide": `
Escribe una guía clara para adultos:
- Qué emociones trabaja el libro
- Por qué son importantes
- 3 consejos prácticos
Tono profesional y cercano.
`.trim(),

    ngo: `
Escribe una página informativa breve sobre una ONG que apoya el bienestar infantil.
Tono inspirador, no comercial.
`.trim()
  };

  return `
${brain}

CONTEXTO GLOBAL:
Edad objetivo: ${ageTarget}
Libro: ${bookTitle || ""}
Subtítulo: ${bookSubtitle || ""}

Personajes globales:
${chars}

TIPO DE PÁGINA: ${pageType}

INSTRUCCIÓN:
${instructionByType[pageType] || instructionByType.story}

ESTILO:
${styleHints}

REGLAS:
- Máximo ${maxWords} palabras.
- Devuelve SOLO el texto final.
- Sin explicaciones.
`.trim();
}
