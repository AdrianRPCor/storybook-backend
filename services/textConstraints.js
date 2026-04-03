// services/textConstraints.js
// maxWords calibrados con las dimensiones reales del PDF (W=432pt H=648pt MARGIN=36pt)
// Página story: imagen ocupa H*0.62, texto en los 204pt restantes
// Con Helvetica 13pt + lineGap 2pt = ~13 líneas × ~8 palabras/línea = ~104 palabras máx
// Usamos 75 palabras (72% del máximo) como límite seguro con margen amplio

export function getMaxWords({ pageType, ageTarget, pagesPerStory }) {
  const ageFactor =
    ageTarget?.includes("3") ? 0.75 :
    ageTarget?.includes("4") ? 0.85 :
    ageTarget?.includes("5") ? 1.0  :
    ageTarget?.includes("6") ? 1.1  :
    ageTarget?.includes("7") ? 1.2  : 1.0;

  const base = {
    cover:          200,   // TÍTULO + SUBTÍTULO + CONTRAPORTADA (necesita espacio suficiente)
    "story-cover":    8,   // Solo título corto
    index:          100,   // Lista de índice
    story:           65,   // 45-65 palabras: 3 párrafos × 2 frases cortas = ~60 palabras
    closing:         40,   // Moraleja: 1 párrafo, entre 30 y 40 palabras
    "adult-guide":  250,   // Página para padres/cuidadores con guía de lectura
    ngo:            120,   // Página entera sin imagen
    blank:            0
  };

  const b = base[pageType] ?? 75;
  return Math.round(b * ageFactor);
}

export function getStyleHints({ pageType, ageTarget }) {
  if (pageType === "cover") {
    return "Usa formato EXACTO: TÍTULO: [máx 8 palabras]\nSUBTÍTULO: [máx 12 palabras]\nCONTRAPORTADA: [máx 80 palabras, segunda persona, cálido, invita a leer].";
  }
  if (pageType === "story-cover") {
    return "Solo el título del cuento. Máximo 8 palabras. Sin puntos. Sin comillas.";
  }
  if (pageType === "story") {
    const dialogRule = "Los diálogos van con raya (—) al inicio, sin comillas. Ejemplo: —¡Hola! —dijo Lía.";
    return ageTarget?.includes("3")
      ? `Escribe 3 párrafos cortos separados por línea en blanco. Cada párrafo: 1-2 frases muy cortas. Vocabulario muy simple. Total máximo 45 palabras. ${dialogRule}`
      : `Escribe 3 párrafos cortos separados por línea en blanco. Cada párrafo: 2 frases que formen una idea completa. Mínimo 45 palabras, máximo 65 palabras. ${dialogRule}`;
  }
  if (pageType === "adult-guide") {
    return "Escribe una guía práctica para el adulto que lee el cuento. Incluye: (1) qué emoción trabaja este cuento y por qué es importante, (2) en qué momentos es mejor leer este cuento al niño (hora del día, estado de ánimo), (3) cuándo NO es buen momento para leerlo, (4) 2-3 preguntas sencillas para hacer al niño durante la lectura. Tono cálido, empático, sin juzgar. Párrafos cortos. Sin viñetas ni listas con guiones.";
  }
  if (pageType === "closing") {
    return "Escribe UN ÚNICO PÁRRAFO de 3 frases exactas que sea la moraleja del cuento. Mínimo 30 palabras, máximo 40 palabras. Muestra qué aprendió el protagonista y cierra con emoción positiva. Sin saltos de línea. Tono cálido, en tercera persona, siguiendo la voz del cuento.";
  }
  if (pageType === "ngo") {
    return "Inspirador, breve, informativo. Tono humano y cercano.";
  }
  if (pageType === "index") {
    return "Lista simple y clara. Sin florituras.";
  }
  return "Frases cortas y claras. Tono cálido.";
}
