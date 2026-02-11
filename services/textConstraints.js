// services/textConstraints.js

export function getMaxWords({ pageType, ageTarget }) {
  // Ajuste simple por edad (puedes afinar después)
  const ageFactor =
    ageTarget?.includes("3") ? 0.75 :
    ageTarget?.includes("4") ? 0.85 :
    ageTarget?.includes("5") ? 1.0  :
    ageTarget?.includes("6") ? 1.15 :
    ageTarget?.includes("7") ? 1.25 : 1.0;

  const base = {
    cover: 12,        // título + subtítulo (poquísimo)
    "story-cover": 10, // título del cuento
    index: 120,
    parents: 220,
    story: 90,        // texto de página con ilustración
    blank: 0
  };

  const b = base[pageType] ?? 90;
  return Math.round(b * ageFactor);
}

export function getStyleHints({ pageType, ageTarget }) {
  if (pageType === "cover" || pageType === "story-cover") {
    return "Corto, emocional, memorable. Sin signos raros. Sin comillas.";
  }
  if (pageType === "parents") {
    return "Claro, práctico, empático. Sin juzgar. Consejos accionables.";
  }
  if (pageType === "index") {
    return "Lista simple y clara. Sin florituras.";
  }
  // story
  return ageTarget?.includes("3")
    ? "Frases cortas. Vocabulario muy simple. Mucha claridad."
    : "Frases cortas/medias. Vocabulario sencillo y cálido.";
}
