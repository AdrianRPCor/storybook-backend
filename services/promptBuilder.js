// services/promptBuilder.js

export function buildPrompt({
  brain,
  page,
  context,
  maxWords,
  styleHints,
  previousPageText = "",
  nextPageGoal = ""
}) {
  const {
    pageType,
    pageNumber,
    storyTitle,
    theme,
    lesson,
    characters = [],
    bookTitle
  } = context;

  const chars = characters.length
    ? characters.map(c => `- ${c.name} (${c.type || "personaje"}): ${c.traits || ""} ${c.visualTraits ? `| rasgos visuales: ${c.visualTraits}` : ""}`.trim()).join("\n")
    : "- (No definidos: crea los mínimos necesarios y mantenlos consistentes)";

  const pageInstruction = (() => {
    switch (pageType) {
      case "cover":
        return `Escribe el TÍTULO y SUBTÍTULO del libro "${bookTitle || ""}".`;
      case "story-cover":
        return `Escribe el título del cuento: "${storyTitle || ""}".`;
      case "index":
        return `Escribe un índice simple del libro (títulos de cuentos y secciones).`;
      case "parents":
        return `Escribe una página para padres: emoción trabajada + por qué importa + 3 consejos prácticos.`;
      case "story":
      default:
        return `Escribe el texto de la página ${pageNumber}. Continúa la historia de forma coherente.`;
    }
  })();

  // Importante: pedir “solo texto final”, y controlar longitud por maxWords
  return `
${brain || ""}

CONTEXTO:
- Edad objetivo: ${context.ageTarget}
- Tipo de página: ${pageType}
- Temática (cuento): ${theme || "emocional general"}
- Enseñanza/objetivo: ${lesson || "aprendizaje emocional positivo"}
- Personajes:
${chars}

COHERENCIA:
- Texto anterior (si existe): ${previousPageText ? `"${previousPageText}"` : "(no disponible)"}
- Próximo objetivo (si existe): ${nextPageGoal || "(no disponible)"}

INSTRUCCIÓN PRINCIPAL:
${pageInstruction}

ESTILO:
${styleHints}

REGLAS DE FORMATO:
- Devuelve SOLO el texto final (sin explicar, sin etiquetas, sin títulos extra).
- Máximo ${maxWords} palabras (estricto).
- Sin violencia, sin miedo intenso, sin moralina directa.
- Final emocional seguro (si aplica).

`.trim();
}
