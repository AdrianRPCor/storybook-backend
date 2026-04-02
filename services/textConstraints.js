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
    cover:          150,   // TÍTULO + SUBTÍTULO + CONTRAPORTADA
    "story-cover":    8,   // Solo título corto
    index:          100,   // Lista de índice
    story:           55,   // 2 párrafos × ~2-3 líneas × ~9 palabras/línea = ~55 palabras
    closing:        130,   // Página entera sin imagen
    "adult-guide":  180,   // Página entera sin imagen
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
      ? `Escribe EXACTAMENTE 2 párrafos separados por una línea en blanco. Cada párrafo: 2 frases muy cortas (3-5 palabras cada una). Vocabulario muy simple. Total máximo 40 palabras. ${dialogRule}`
      : `Escribe EXACTAMENTE 2 párrafos separados por una línea en blanco. Cada párrafo: 2-3 frases cortas que formen una idea completa (no listas de frases sueltas). Total máximo 55 palabras. ${dialogRule}`;
  }
  if (pageType === "adult-guide") {
    return "Claro, práctico, empático. Sin juzgar. Consejos accionables en párrafos cortos.";
  }
  if (pageType === "closing") {
    return "Cálido, esperanzador, cierre emocional positivo. Frases cortas y cálidas.";
  }
  if (pageType === "ngo") {
    return "Inspirador, breve, informativo. Tono humano y cercano.";
  }
  if (pageType === "index") {
    return "Lista simple y clara. Sin florituras.";
  }
  return "Frases cortas y claras. Tono cálido.";
}
