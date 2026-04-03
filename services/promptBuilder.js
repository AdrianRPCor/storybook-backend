// services/promptBuilder.js

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
  } = context || {};

  // =========================
  // PERSONAJES — descripción técnica completa para consistencia visual
  // =========================
  // Si el personaje tiene descripción técnica de prompt (promptDescription),
  // se usa esa. Si no, se usa la descripción normal.
  // El objetivo es que el bloque de personajes sea lo suficientemente
  // específico para que la IA genere el texto siempre refiriéndose
  // al mismo personaje con los mismos rasgos.

  const chars = Array.isArray(characters) && characters.length
    ? characters.map(c => {
        const desc = c?.promptDescription || c?.description || "";
        return `- ${c?.name || "Personaje"}: ${desc}`;
      }).join("\n")
    : "- Usa solo los personajes necesarios y mantenlos coherentes entre páginas.";

  // =========================
  // BLOQUE PARA PROMPTS DE IMAGEN — se incluye en story para máxima consistencia
  // =========================
  const charPromptBlock = Array.isArray(characters) && characters.length
    ? characters.map(c => {
        const desc = c?.promptDescription || c?.description || "";
        return `${c?.name || "Personaje"}: ${desc}`;
      }).join(". ")
    : "";

  // =========================
  // INSTRUCCIONES POR TIPO
  // =========================

  const instructionByType = {

    cover: `
Escribe en este formato EXACTO (usa estos prefijos literalmente):
TÍTULO: [máximo 8 palabras, emocional y atractivo]
SUBTÍTULO: [máximo 12 palabras, enfocado al beneficio emocional]
CONTRAPORTADA: [máximo 80 palabras, texto que va en la contraportada del libro]

Debe reflejar las temáticas del libro.
El texto de CONTRAPORTADA debe ser en segunda persona del singular (dirigido al lector adulto),
cálido, que invite a leer el libro. Sin comillas ni signos extraños.
`.trim(),

    "story-cover": `
Escribe SOLO el título del cuento.
Máximo 8 palabras.
Debe reflejar la enseñanza: ${lesson || "emocional"}.
Sin puntos finales. Sin comillas.
`.trim(),

    index: `
Escribe un índice estructurado usando EXACTAMENTE estos títulos:

${Array.isArray(storyTitles) && storyTitles.length
  ? storyTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")
  : "1. Cuento 1\n2. Cuento 2"}

Después añade:
- Página final emocional
- Guía para adultos
- Sobre la ONG

No inventes títulos nuevos.
`.trim(),

    story: `
Continúa el cuento "${storyTitle || "Historia"}".

FORMATO OBLIGATORIO — 3 párrafos separados por LÍNEA EN BLANCO:

Párrafo 1: 2 frases cortas sobre una acción o emoción.

Párrafo 2: 2 frases que desarrollan la situación. Si hay diálogo, usa raya (—) al inicio.

Párrafo 3: 2 frases que avanzan hacia el desenlace.

REGLAS:
- Cada párrafo separado por una línea en blanco (\n\n).
- NO uses saltos de línea dentro de un párrafo.
- Frases cortas (máximo 10 palabras).
- No reinicies ni repitas lo anterior.
- Objetivo: ${nextPageGoal || "Desarrollo narrativo"}

Texto anterior: "${previousPageText || "(inicio del cuento)"}"
`.trim(),

    closing: `
Escribe una página final emocional para cerrar todo el libro.

FORMATO:
- Párrafos cortos (2-3 frases cada uno).
- Separa los párrafos con una línea en blanco.
- Frases cálidas, positivas, que transmitan seguridad y crecimiento.
- No repitas los cuentos ni resumos.
- Segunda persona del singular ("tú/te"), dirigido al niño.
`.trim(),

    "adult-guide": `
Escribe una guía para adultos.

ESTRUCTURA (usa exactamente estos bloques):
1. Qué emociones trabaja este libro y por qué son importantes (2-3 frases).
2. Cómo acompañar al niño mientras lee (2-3 frases).
3. Tres consejos prácticos numerados (1. / 2. / 3.) — uno por línea.

FORMATO:
- Párrafos separados por línea en blanco.
- Tono cercano, empático, en segunda persona del singular.
- Sin juzgar. Sin tecnicismos.
`.trim(),

    ngo: `
Escribe una página para presentar Proyecto Arena, una ONG de Murcia (España)
que ayuda a padres en educación emocional, nutrición y primeros auxilios para niños de 0 a 4 años.

ESTRUCTURA:
- Párrafo 1 (3-4 frases): qué hace Proyecto Arena y su misión.
- Párrafo 2 (2-3 frases): invitación a unirse como socio o suscribirse gratis en proyectoarena.com,
  mencionando que recibirán consejos según la edad exacta del hijo.
- Párrafo 3 (2 frases): cierre inspirador sobre ayudar a más familias.

FORMATO:
- Párrafos separados por línea en blanco.
- Tono cálido, cercano, nunca comercial.
- Máximo 120 palabras en total.
`.trim()
  };

  const instruction = instructionByType[pageType] || instructionByType["story"];

  // =========================
  // PROMPT FINAL
  // =========================

  return `
${brain || ""}

CONTEXTO GLOBAL:
Edad objetivo: ${ageTarget || "infantil"}
Libro: ${bookTitle || ""}
Subtítulo: ${bookSubtitle || ""}

PERSONAJES (mantén SIEMPRE estos rasgos exactos en el texto):
${chars}

TIPO DE PÁGINA: ${pageType || "story"}

INSTRUCCIÓN:
${instruction}

ESTILO:
${styleHints || ""}

REGLAS FINALES:
- Máximo ${maxWords || 120} palabras.
- Devuelve SOLO el texto final. Sin títulos, sin explicaciones, sin comillas alrededor.
- Nunca uses markdown (**negrita**, *cursiva*, ## títulos).
- Cada frase en su propia línea cuando el tipo sea "story".
`.trim();
}
