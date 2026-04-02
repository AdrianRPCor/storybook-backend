// services/pdfGenerator.js
// PDF PROFESIONAL KDP 6×9" con imágenes, portada y maquetación editorial real

import PDFDocument from "pdfkit";
import axios from "axios";

// ============================================================
//  DIMENSIONES KDP 6x9 en puntos (1 pulgada = 72 puntos)
// ============================================================
const W = 432;   // 6"  × 72
const H = 648;   // 9"  × 72
const MARGIN = 36; // 0.5" margen

const COLOR_TEXT      = "#111827";
const COLOR_MUTED     = "#6b7280";
const COLOR_COVER_BG  = "#1e3a5f";

// ============================================================
//  UTILIDAD: descargar imagen a Buffer
// ============================================================
async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    if (url.startsWith("data:image")) {
      const base64 = url.split(",")[1];
      return Buffer.from(base64, "base64");
    }
    const response = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
    return Buffer.from(response.data);
  } catch (e) {
    console.warn("⚠️ No se pudo cargar imagen:", url?.slice(0, 60), e.message);
    return null;
  }
}

// ============================================================
//  PÁGINA EN BLANCO
// ============================================================
function addBlankPage(doc, color = "#ffffff") {
  doc.addPage({ size: [W, H] });
  doc.rect(0, 0, W, H).fill(color);
}

// ============================================================
//  PORTADA INTERIOR
// ============================================================
async function addCoverPage(doc, page, settings) {
  doc.addPage({ size: [W, H] });
  const imgBuf = await fetchImageBuffer(page.imageUrl);

  if (imgBuf) {
    doc.image(imgBuf, 0, 0, { width: W, height: H, cover: [W, H] });
    doc.rect(0, H * 0.55, W, H * 0.45).fill("rgba(0,0,0,0.45)");
  } else {
    doc.rect(0, 0, W, H).fill(settings?.coverBg || COLOR_COVER_BG);
    doc.circle(W * 0.75, H * 0.25, 90).fill("rgba(255,255,255,0.07)");
    doc.circle(W * 0.15, H * 0.7,  60).fill("rgba(255,255,255,0.05)");
  }

  // FIX: leer desde múltiples fuentes porque a veces settings llega sin estos campos
  const title    = (settings?.bookTitle    || page?.title    || "").trim();
  const subtitle = (settings?.bookSubtitle || page?.subtitle || "").trim();

  if (title) {
    doc
      .font("Helvetica-Bold")
      .fontSize(title.length > 40 ? 24 : 28)
      .fillColor("#ffffff")
      .text(title, MARGIN + 10, H * 0.62, { width: W - MARGIN * 2 - 20, align: "center", lineGap: 4 });
  }
  if (subtitle) {
    doc
      .font("Helvetica")
      .fontSize(13)
      .fillColor("rgba(255,255,255,0.88)")
      .text(subtitle, MARGIN + 10, doc.y + 10, { width: W - MARGIN * 2 - 20, align: "center" });
  }
}

// ============================================================
//  ÍNDICE
//  - Fondo: blankPageColor del usuario
//  - Imagen decorativa en parte inferior
// ============================================================
async function addIndexPage(doc, page, settings) {
  const bgColor = settings?.blankPageColor || "#ffffff";
  doc.addPage({ size: [W, H] });
  doc.rect(0, 0, W, H).fill(bgColor);

  const imgBuf = page.imageUrl ? await fetchImageBuffer(page.imageUrl) : null;

  if (imgBuf) {
    const imgHeight = H * 0.32;
    const imgY = H - imgHeight;
    doc.save();
    doc.rect(0, imgY, W, imgHeight).clip();
    doc.image(imgBuf, 0, imgY, { cover: [W, imgHeight], align: "center", valign: "top" });
    doc.restore();
    // Degradado para que no corte bruscamente
    doc.rect(0, imgY - 50, W, 60).fill(bgColor);
  }

  const paddingX = MARGIN + 14;
  const contentW = W - paddingX * 2;

  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(COLOR_TEXT)
    .text("ÍNDICE", 0, MARGIN + 12, { width: W, align: "center" });

  doc
    .moveTo(paddingX + 20, MARGIN + 42)
    .lineTo(W - paddingX - 20, MARGIN + 42)
    .strokeColor("#9ca3af")
    .lineWidth(0.8)
    .stroke();

  let y = MARGIN + 58;
  const maxY = imgBuf ? H * 0.62 : H - MARGIN - 20;
  const lines = (page.text || "").split("\n").filter(l => l.trim() !== "");

  lines.forEach(line => {
    if (y > maxY) return;
    const match = line.match(/^(.*?)\.{2,}\s*(\d+)\s*$/);
    if (match) {
      const titleText = match[1].trim();
      const pageNum   = match[2];
      doc.font("Helvetica").fontSize(12).fillColor(COLOR_TEXT)
         .text(titleText, paddingX, y, { width: contentW - 32, continued: false });
      doc.font("Helvetica").fontSize(12).fillColor(COLOR_MUTED)
         .text(pageNum, W - paddingX - 28, y, { width: 28, align: "right" });
      const titleW = doc.widthOfString(titleText, { font: "Helvetica", fontSize: 12 });
      const dotsX1 = paddingX + titleW + 4;
      const dotsX2 = W - paddingX - 32;
      if (dotsX2 > dotsX1 + 10) {
        doc.moveTo(dotsX1, y + 9).lineTo(dotsX2, y + 9)
           .dash(2, { space: 3 }).strokeColor("#9ca3af").lineWidth(0.5).stroke().undash();
      }
      y += 26;
    } else {
      y += 14;
    }
  });
}

// ============================================================
//  PORTADA DE CUENTO (story-cover)
// ============================================================
async function addStoryCoverPage(doc, page, storyIndex) {
  doc.addPage({ size: [W, H] });
  const imgBuf = await fetchImageBuffer(page.imageUrl);
  const colors = ["#1e3a5f", "#3b1f5e", "#1a4731", "#5e1f1f", "#1f3d5e", "#4a2c1a"];
  const bgColor = colors[storyIndex % colors.length];

  if (imgBuf) {
    doc.image(imgBuf, 0, 0, { width: W, height: H * 0.7, cover: [W, H * 0.7] });
    doc.rect(0, H * 0.7, W, H * 0.3).fill(bgColor);
    doc.rect(0, H * 0.6, W, H * 0.12).fill("rgba(0,0,0,0.15)");
  } else {
    doc.rect(0, 0, W, H).fill(bgColor);
    doc.circle(W * 0.8, H * 0.15, 70).fill("rgba(255,255,255,0.06)");
    doc.circle(W * 0.1, H * 0.8,  50).fill("rgba(255,255,255,0.04)");
  }

  doc.font("Helvetica").fontSize(11).fillColor("rgba(255,255,255,0.6)")
     .text(`Cuento ${storyIndex + 1}`, 0, H * 0.72 + 10, { width: W, align: "center" });

  doc.font("Helvetica-Bold").fontSize(24).fillColor("#ffffff")
     .text(page.title || `Cuento ${storyIndex + 1}`, MARGIN, H * 0.72 + 30, {
       width: W - MARGIN * 2, align: "center", lineGap: 3
     });
}

// ============================================================
//  PÁGINA DE HISTORIA
//  FIX: texto dividido en párrafos cortos para lectura en voz alta
// ============================================================
async function addStoryPage(doc, page, settings) {
  doc.addPage({ size: [W, H] });
  doc.rect(0, 0, W, H).fill("#ffffff");

  const imgBuf = await fetchImageBuffer(page.imageUrl);
  const imgH   = H * 0.62;

  if (imgBuf) {
    doc.save();
    doc.roundedRect(MARGIN, MARGIN, W - MARGIN * 2, imgH - MARGIN, 12).clip();
    doc.image(imgBuf, MARGIN, MARGIN, {
      fit: [W - MARGIN * 2, imgH - MARGIN], align: "center", valign: "center"
    });
    doc.restore();
  } else {
    doc.roundedRect(MARGIN, MARGIN, W - MARGIN * 2, imgH - MARGIN, 12).fill("#eef2f7");
    doc.font("Helvetica").fontSize(11).fillColor(COLOR_MUTED)
       .text("Ilustración", 0, MARGIN + (imgH - MARGIN) / 2 - 6, { width: W, align: "center" });
  }

  const textBoxColor = settings?.textBoxColor || "#f9fafb";
  const textY    = imgH + 6;
  // Reservar 28pt al final para el número de página
  const textBoxH = H - textY - MARGIN - 28;

  doc.roundedRect(MARGIN, textY, W - MARGIN * 2, textBoxH, 10).fill(textBoxColor);

  // FIX: dividir primero por saltos de línea, y si viene en bloque
  // dividir por punto + espacio + mayúscula para lectura en voz alta
  const rawText = (page.text || "").trim();
  let paragraphs = rawText.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);

  if (paragraphs.length <= 1 && rawText.length > 80) {
    paragraphs = rawText
      .split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÜÑ¿¡"])/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  let curY = textY + 12;
  const textW   = W - MARGIN * 2 - 28;
  // Tope máximo: dejar 22pt para el número de página
  const maxTextY = H - MARGIN - 50; // dejar espacio para número de página

  const storyFontSize = 11.5; // reducido para caber más texto en el recuadro
  doc.font("Helvetica").fontSize(storyFontSize).fillColor(COLOR_TEXT);

  for (const para of paragraphs) {
    if (curY > maxTextY) break;
    // Medir altura del párrafo antes de dibujarlo
    const paraH = doc.heightOfString(para, { width: textW });
    if (curY + paraH > maxTextY) {
      // Truncar: dibujar lo que quepa en el espacio restante
      const availH = maxTextY - curY;
      const linesAvail = Math.max(1, Math.floor(availH / 15));
      // Dividir el párrafo en palabras y tomar las que caben
      const words = para.split(" ");
      let partial = "";
      for (const word of words) {
        const test = partial ? partial + " " + word : word;
        const testH = doc.heightOfString(test, { width: textW });
        if (testH > availH) break;
        partial = test;
      }
      if (partial) {
        doc.text(partial, MARGIN + 14, curY, { width: textW, align: "left", lineGap: 2 });
      }
      break;
    }
    doc.text(para, MARGIN + 14, curY, { width: textW, align: "left", lineGap: 2 });
    curY = doc.y + 6;
  }
}

// ============================================================
//  PÁGINAS DE TEXTO EDITORIAL (Moraleja / Guía adultos / ONG)
//  FIX: banda de color por tipo, maquetación limpia, URL en pie
// ============================================================
async function addTextPage(doc, page, settings) {
  const bgColor = settings?.blankPageColor || "#ffffff";
  doc.addPage({ size: [W, H] });
  doc.rect(0, 0, W, H).fill(bgColor);

  const configs = {
    "closing": {
      title:       "Moraleja",
      accentColor: "#7c3aed",
      fontSize:    13.5,
      lineGap:     8,
      centered:    true,
      italic:      true
    },
    "adult-guide": {
      title:       "Para quien lee este cuento",
      accentColor: "#0e7490",
      fontSize:    12,
      lineGap:     6,
      centered:    false,
      italic:      false
    },
    "ngo": {
      title:       "Sobre Proyecto Arena",
      accentColor: "#15803d",
      fontSize:    12,
      lineGap:     6,
      centered:    false,
      italic:      false
    }
  };

  const cfg = configs[page.type] || configs["adult-guide"];

  // Banda de color superior (cabecera visual)
  const bandH = 52;
  doc.rect(0, 0, W, bandH).fill(cfg.accentColor);
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#ffffff")
    .text(cfg.title, MARGIN, (bandH - 16) / 2, { width: W - MARGIN * 2, align: "center" });

  let contentY = bandH + 20;

  // Imagen para Moraleja
  const imgBuf = page.imageUrl ? await fetchImageBuffer(page.imageUrl) : null;
  if (imgBuf && page.type === "closing") {
    const imgH = Math.min(H * 0.35, H - contentY - MARGIN - 80);
    doc.save();
    doc.roundedRect(MARGIN, contentY, W - MARGIN * 2, imgH, 10).clip();
    doc.image(imgBuf, MARGIN, contentY, { fit: [W - MARGIN * 2, imgH], align: "center", valign: "center" });
    doc.restore();
    contentY += imgH + 18;
  }

  // Texto limpio, párrafos cortos
  let rawText = (page.text || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#+ /g, "")
    .replace(/^[-•]\s*/gm, "")
    .trim();

  const paragraphs = rawText.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
  const textW = W - MARGIN * 2 - 16;
  const font  = cfg.italic ? "Helvetica-Oblique" : "Helvetica";

  // Reservar espacio para el pie en ngo
  const bottomReserve = page.type === "ngo" ? 70 : 30;

  doc.font(font).fontSize(cfg.fontSize).fillColor(COLOR_TEXT);

  for (const para of paragraphs) {
    if (contentY > H - MARGIN - bottomReserve) break;
    doc.text(para, MARGIN + 8, contentY, {
      width: textW,
      align: cfg.centered ? "center" : "left",
      lineGap: 2
    });
    contentY = doc.y + cfg.lineGap;
  }

  // Pie ONG con banda de color
  if (page.type === "ngo") {
    const urlBoxY = H - MARGIN - 44;
    doc.rect(0, urlBoxY - 10, W, 54).fill(cfg.accentColor);
    doc
      .font("Helvetica-Bold").fontSize(11).fillColor("rgba(255,255,255,0.85)")
      .text("Visítanos en:", MARGIN, urlBoxY, { width: W - MARGIN * 2, align: "center" });
    doc
      .font("Helvetica").fontSize(13).fillColor("#ffffff")
      .text("www.proyectoarena.com", MARGIN, urlBoxY + 16, {
        width: W - MARGIN * 2, align: "center", link: "https://proyectoarena.com"
      });
  }

  // Pie sutil en moraleja y guía adultos
  if (page.type === "closing" || page.type === "adult-guide") {
    doc.font("Helvetica").fontSize(8).fillColor(COLOR_MUTED)
       .text("proyectoarena.com", 0, H - MARGIN - 10, { width: W, align: "center" });
  }
}

// ============================================================
//  NÚMERO DE PÁGINA
// ============================================================
function addPageNumber(doc, pageNum) {
  // Dibujar número de página con posición ABSOLUTA usando graphics layer
  // para no interferir con el flujo de texto de la página.
  // Posición: centro horizontal, Y=H-18 (dentro del sangrado inferior)
  doc.save();
  doc.font("Helvetica").fontSize(9).fillColor(COLOR_MUTED);
  // Forzar posición: resetear cursor y usar coordenadas absolutas
  doc.page.margins = { top:0, bottom:0, left:0, right:0 };
  doc.text(String(pageNum), 0, H - 20, {
    width: W,
    align: "center",
    lineBreak: false,
    baseline: "alphabetic"
  });
  doc.restore();
}

// ============================================================
//  generatePdf — PDF INTERIOR
// ============================================================
export async function generatePdf(bookData) {
  const doc = new PDFDocument({
    size: [W, H],
    autoFirstPage: false,
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    info: {
      Title:   bookData?.meta?.bookTitle   || "Libro de cuentos",
      Author:  "Storybook KDP Editor",
      Subject: bookData?.meta?.bookSubtitle || "Cuentos infantiles educativos"
    }
  });

  const buffers = [];
  doc.on("data", chunk => buffers.push(chunk));

  const pages    = bookData?.pages   || [];
  const stories  = bookData?.stories || [];
  const settings = bookData?.settings || {};
  let globalPageNum = 0;

  // Determinar qué blanks son válidos:
  // Solo el que va tras la portada (order=1) y el final del libro
  const validBlanks = new Set();
  const sortedPages = [...pages].sort((a,b) => a.order - b.order);
  sortedPages.forEach((p, i) => {
    if (p.type === "blank") {
      const prev = sortedPages[i-1];
      const next = sortedPages[i+1];
      // Blank válido: tras portada del libro O al final (último elemento)
      if (prev?.type === "cover" || !next) {
        validBlanks.add(p.id);
      }
      // Blank válido también: tras el índice (por si hay alguno)
      if (prev?.type === "index") {
        validBlanks.add(p.id);
      }
    }
  });

  for (const page of pages) {
    if (page.type === "blank") {
      if (validBlanks.has(page.id)) {
        addBlankPage(doc, page.color || settings.blankPageColor || "#ffffff");
      }
      // Ignorar blanks que no son portada ni final
      continue;
    }

    globalPageNum++;

    if (page.type === "cover") {
      await addCoverPage(doc, page, {
        bookTitle:    bookData?.meta?.bookTitle    || page.title    || "",
        bookSubtitle: bookData?.meta?.bookSubtitle || page.subtitle || "",
        ...settings
      });
    } else if (page.type === "index") {
      await addIndexPage(doc, page, settings);
      addPageNumber(doc, globalPageNum);
    } else if (page.type === "story-cover") {
      const storyIdx = stories.findIndex(s => s.id === page.storyId);
      await addStoryCoverPage(doc, page, storyIdx >= 0 ? storyIdx : 0);
    } else if (page.type === "story") {
      await addStoryPage(doc, page, settings);
      addPageNumber(doc, globalPageNum);
    } else if (["closing", "adult-guide", "ngo"].includes(page.type)) {
      await addTextPage(doc, page, settings);
      addPageNumber(doc, globalPageNum);
    } else {
      doc.addPage({ size: [W, H] });
      doc.rect(0, 0, W, H).fill("#ffffff");
      if (page.text) {
        doc.font("Helvetica").fontSize(12).fillColor(COLOR_TEXT)
           .text(page.text, MARGIN, MARGIN, { width: W - MARGIN * 2 });
      }
    }
  }

  doc.end();
  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
  });
}

// ============================================================
//  generateCoverPdf — PORTADA KDP SPREAD COMPLETO
//  FIX principal: lomo dinámico por páginas reales;
//                 triple fallback para backCoverText
// ============================================================
export async function generateCoverPdf(bookData) {

  const PAPER_FACTOR = 0.002252;       // pulgadas/página tapa dura KDP
  const realPageCount = (bookData?.pages || []).length || 68;

  const BLEED   = 0.125 * 72;          // 9pt de sangrado
  const TRIM_W  = 6 * 72;              // 432pt
  const TRIM_H  = 9 * 72;              // 648pt

  const spineWidth  = realPageCount * PAPER_FACTOR * 72;
  const coverWidth  = TRIM_W * 2 + spineWidth + BLEED * 2;
  const coverHeight = TRIM_H + BLEED * 2;

  const doc = new PDFDocument({ size: [coverWidth, coverHeight], autoFirstPage: false });
  const buffers = [];
  doc.on("data", chunk => buffers.push(chunk));
  doc.addPage({ size: [coverWidth, coverHeight] });

  const coverPage = (bookData?.pages || []).find(p => p.type === "cover");

  const imgBuf     = coverPage?.imageUrl     ? await fetchImageBuffer(coverPage.imageUrl)     : null;
  const backImgBuf = coverPage?.backImageUrl ? await fetchImageBuffer(coverPage.backImageUrl) : imgBuf;

  const title     = (bookData?.meta?.bookTitle    || "Título").trim();
  const subtitle  = (bookData?.meta?.bookSubtitle || "").trim();
  const spineText = (bookData?.meta?.spineText    || title).trim();

  // FIX: cuádruple fallback para backCoverText
  let backText = (bookData?.meta?.backCoverText || "").trim();
  if (!backText) backText = (coverPage?.backText || "").trim();
  // Si el panel de portada está visible, intentar leer directamente desde el payload
  // (el frontend ya lo sincroniza antes de enviar, pero por si acaso)
  if (!backText) backText = (bookData?.pages?.find(p=>p.type==="cover")?.backText || "").trim();
  if (!backText && coverPage?.text) {
    const lines = coverPage.text.split("\n").map(l => l.trim()).filter(Boolean);
    const bi = lines.findIndex(l => /CONTRAPORTADA\s*:/i.test(l));
    if (bi >= 0) backText = lines.slice(bi + 1).join(" ").trim();
    else if (lines.length >= 3) backText = lines.slice(2).join(" ").trim();
  }

  const backX  = BLEED;
  const spineX = BLEED + TRIM_W;
  const frontX = BLEED + TRIM_W + spineWidth;

  doc.rect(0, 0, coverWidth, coverHeight).fill("#1e3a5f"); // fondo general azul, evita recuadros blancos

  // ── CONTRAPORTADA ──
  if (backImgBuf) {
    doc.save();
    doc.rect(backX, BLEED, TRIM_W, TRIM_H).clip();
    doc.image(backImgBuf, backX, BLEED, { cover: [TRIM_W, TRIM_H], align: "center", valign: "center" });
    doc.restore();
  } else {
    doc.rect(backX, BLEED, TRIM_W, TRIM_H).fill("#1e3a5f");
  }

  // Caja para texto — fondo semitransparente (PDFKit no soporta rgba en fill, usar fillOpacity)
  if (backText) {
    // Medir altura real del texto para ajustar el recuadro
    doc.font("Helvetica-Oblique").fontSize(11.5);
    const backTextH = doc.heightOfString(backText, { width: TRIM_W - 80 });
    const backBoxPad = 16;
    const backBoxH = backTextH + backBoxPad * 2;

    doc.save();
    doc.fillColor("#000000").fillOpacity(0.52);
    doc.roundedRect(backX + 24, BLEED + 20, TRIM_W - 48, backBoxH, 8).fill();
    doc.restore();

    doc.fillColor("#ffffff").fillOpacity(1)
      .font("Helvetica-Oblique")
      .fontSize(11.5)
      .text(backText, backX + 40, BLEED + 20 + backBoxPad, {
        width: TRIM_W - 80, align: "center", lineGap: 4
      });
  }

  // ── LOMO ──
  const spineColor = bookData?.settings?.spineColor || "#1e3a5f";
  doc.rect(spineX, BLEED, spineWidth, TRIM_H).fill(spineColor);

  if (spineWidth > 6 && spineText) {
    let spineFontSize = 10;
    if (spineWidth < 26) spineFontSize = 8;
    if (spineWidth < 18) spineFontSize = 7;
    if (spineWidth < 12) spineFontSize = 6;
    doc.save();
    doc.translate(spineX + spineWidth / 2, BLEED + TRIM_H / 2);
    doc.rotate(-90);
    doc.font("Helvetica-Bold").fontSize(spineFontSize).fillColor("#ffffff")
       .text(spineText, -TRIM_H / 2 + 20, -spineFontSize / 2, {
         width: TRIM_H - 40, align: "center"
       });
    doc.restore();
  }

  // ── PORTADA FRONTAL ──
  if (imgBuf) {
    doc.save();
    doc.rect(frontX, BLEED, TRIM_W, TRIM_H).clip();
    doc.image(imgBuf, frontX, BLEED, { cover: [TRIM_W, TRIM_H], align: "center", valign: "center" });
    doc.restore();
  } else {
    doc.rect(frontX, BLEED, TRIM_W, TRIM_H).fill("#1e3a5f");
  }

  const titleFontSize = title.length > 50 ? 22 : title.length > 35 ? 25 : 28;
  const titleBoxW = TRIM_W - 60;
  const titleBoxX = frontX + 30;
  const titleStartY = BLEED + TRIM_H * 0.60;
  const titlePad = 14; // padding interno del recuadro

  // Calcular altura del texto del título para ajustar el recuadro
  doc.font("Helvetica-Bold").fontSize(titleFontSize);
  const titleH = doc.heightOfString(title, { width: titleBoxW - titlePad * 2 });
  let subtitleH = 0;
  if (subtitle) {
    doc.font("Helvetica").fontSize(13);
    subtitleH = doc.heightOfString(subtitle, { width: titleBoxW - titlePad * 2 }) + 10;
  }
  const boxH = titleH + subtitleH + titlePad * 2;

  // Recuadro oscuro ajustado al texto — transparencia real con fillOpacity
  doc.save();
  doc.fillColor("#000000").fillOpacity(0.55);
  doc.roundedRect(frontX + 30, titleStartY - titlePad, titleBoxW, boxH, 8).fill();
  doc.restore();

  // Título
  doc.fillColor("#ffffff").fillOpacity(1)
     .font("Helvetica-Bold").fontSize(titleFontSize)
     .text(title, titleBoxX + titlePad, titleStartY, {
       width: titleBoxW - titlePad * 2, align: "center", lineGap: 5
     });

  if (subtitle) {
    doc.fillColor("#ffffff").fillOpacity(0.90)
       .font("Helvetica").fontSize(13)
       .text(subtitle, titleBoxX + titlePad, doc.y + 8, {
         width: titleBoxW - titlePad * 2, align: "center", lineGap: 3
       });
    doc.fillOpacity(1);
  }

  // ── Logo ONG ──
  const logoUrl = bookData?.meta?.logoUrl || null;
  if (logoUrl) {
    const logoBuf = await fetchImageBuffer(logoUrl);
    if (logoBuf) {
      const logoH = 40, logoW = 80;
      try { doc.image(logoBuf, frontX + TRIM_W - logoW - 18, BLEED + TRIM_H - logoH - 18, { fit: [logoW, logoH] }); }
      catch(e) { console.warn("Logo portada:", e.message); }
      try { doc.image(logoBuf, backX + TRIM_W / 2 - logoW / 2, BLEED + TRIM_H - logoH - 18, { fit: [logoW, logoH] }); }
      catch(e) { console.warn("Logo contraportada:", e.message); }
    }
  }

  doc.end();
  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
  });
}
