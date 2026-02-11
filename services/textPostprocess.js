// services/textPostprocess.js

export function countWords(text = "") {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function cleanText(text = "") {
  // Limpieza mínima: quita encabezados típicos, comillas raras, etc.
  return text
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/^\s*(TÍTULO:|SUBTÍTULO:|TITULO:)\s*/gim, "")
    .trim();
}

export function enforceSingleBlock(text = "") {
  // Evita listas enormes en story pages, y recorta saltos excesivos
  return text.replace(/\n{3,}/g, "\n\n").trim();
}
