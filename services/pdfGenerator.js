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

// Colores corporativos por defecto
const COLOR_TEXT      = "#111827";
const COLOR_MUTED     = "#6b7280";
const COLOR_COVER_BG  = "#1e3a5f";

// ============================================================
//  UTILIDAD: descargar imagen a Buffer (soporta data URL y http)
// ============================================================
async function fetchImageBuffer(url) {
  if (!url) return null;

  try {
    // data URL (base64)
    if (url.startsWith("data:image")) {
      const base64 = url.split(",")[1];
      return Buffer.from(base64, "base64");
    }

    // URL remota
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 20000
    });
    return Buffer.from(response.data);
  } catch (e) {
    console.warn("⚠️ No se pudo cargar imagen:", url?.slice(0, 60), e.message);
    return null;
  }
}

// ============================================================
//  PÁGINA EN BLANCO (color sólido)
// ============================================================
function addBlankPage(doc, color = "#ffffff") {
  doc.addPage({ size: [W, H] });
  doc.rect(0, 0, W, H).fill(color);
}

// ============================================================
//  PORTADA COMPLETA KDP (portada + lomo + contraportada)
//  Proporción aprox 12.4" × 9.25" (simplificada interior 6×9)
// ============================================================
async function addCoverPage(doc, page, settings) {
  doc.addPage({ size: [W, H] });

  const imgBuf = await fetchImageBuffer(page.imageUrl);

  if (imgBuf) {
    // Imagen de fondo completa
    doc.image(imgBuf, 0, 0, { width: W, height: H, cover: [W, H] });
    // Degradado semi-transparente inferior para legibilidad
    doc.rect(0, H * 0.55, W, H * 0.45)
       .fill("rgba(0,0,0,0.45)");
  } else {
    // Fondo de color si no hay imagen
    const bg = settings?.coverBg || COLOR_COVER_BG;
    doc.rect(0, 0, W, H).fill(bg);
    // Decoración geométrica
    doc.circle(W * 0.75, H * 0.25, 90).fill("rgba(255,255,255,0.07)");
    doc.circle(W * 0.15, H * 0.7,  60).fill("rgba(255,255,255,0.05)");
  }
}

// ============================================================
//  ÍNDICE EDITORIAL
// ============================================================
function addIndexPage(doc, page) {
  doc.addPage({ size: [W, H] });
  doc.rect(0, 0, W, H).fill("#ffffff");

  const paddingX = MARGIN + 10;
  const contentW = W - paddingX * 2;

  // Título "ÍNDICE"
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(COLOR_TEXT)
    .text("ÍNDICE", 0, MARGIN + 10, { width: W, align: "center" });

  // Línea decorativa
  doc
    .moveTo(paddingX + 40, MARGIN + 38)
    .lineTo(W - paddingX - 40, MARGIN + 38)
    .strokeColor("#e5e7eb")
    .lineWidth(1)
    .stroke();

  let y = MARGIN + 56;

  // Parsear líneas del índice
  const lines = (page.text || "")
    .split("\n")
    .filter(l => l.trim() !== "");

  lines.forEach(line => {
    if (y > H - MARGIN - 20) return;

    // Detectar número de página al final
    const match = line.match(/^(.*?)\.{2,}\s*(\d+)\s*$/);

    if (match) {
      const titleText = match[1].trim();
      const pageNum   = match[2];

      // Título de entrada
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor(COLOR_TEXT)
        .text(titleText, paddingX, y, {
          width: contentW - 30,
          continued: false,
          ellipsis: true
        });

      // Número de página (derecha)
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor(COLOR_MUTED)
        .text(pageNum, W - paddingX - 26, y, {
          width: 26,
          align: "right"
        });

      // Línea de puntos
      const titleW = doc.widthOfString(titleText, { font: "Helvetica", fontSize: 11 });
      const numW   = 26;
      const dotsX1 = paddingX + titleW + 4;
      const dotsX2 = W - paddingX - numW - 4;

      if (dotsX2 > dotsX1 + 10) {
        doc
          .moveTo(dotsX1, y + 9)
          .lineTo(dotsX2, y + 9)
          .dash(2, { space: 3 })
          .strokeColor("#d1d5db")
          .lineWidth(0.5)
          .stroke()
          .undash();
      }

      y += 22;

    } else {
      // Línea de separación / vacía
      y += 12;
    }
  });
}

// ============================================================
//  PORTADA DE CUENTO (story-cover)
// ============================================================
async function addStoryCoverPage(doc, page, storyIndex) {
  doc.addPage({ size: [W, H] });

  const imgBuf = await fetchImageBuffer(page.imageUrl);
  const colors = [
    "#1e3a5f", "#3b1f5e", "#1a4731",
    "#5e1f1f", "#1f3d5e", "#4a2c1a"
  ];
  const bgColor = colors[storyIndex % colors.length];

  if (imgBuf) {
    doc.image(imgBuf, 0, 0, { width: W, height: H * 0.7, cover: [W, H * 0.7] });
    doc.rect(0, H * 0.7, W, H * 0.3).fill(bgColor);
    // Degradado de transición
    doc.rect(0, H * 0.6, W, H * 0.12).fill("rgba(0,0,0,0.15)");
  } else {
    doc.rect(0, 0, W, H).fill(bgColor);
    // Círculos decorativos
    doc.circle(W * 0.8, H * 0.15, 70).fill("rgba(255,255,255,0.06)");
    doc.circle(W * 0.1, H * 0.8,  50).fill("rgba(255,255,255,0.04)");
  }

  // Número de cuento
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("rgba(255,255,255,0.6)")
    .text(`Cuento ${storyIndex + 1}`, 0, H * 0.72 + 10, {
      width: W,
      align: "center"
    });

  // Título del cuento
  const title = page.title || `Cuento ${storyIndex + 1}`;
  doc
    .font("Helvetica-Bold")
    .fontSize(24)
    .fillColor("#ffffff")
    .text(title, MARGIN, H * 0.72 + 30, {
      width: W - MARGIN * 2,
      align: "center",
      lineGap: 3
    });
}

// ============================================================
//  PÁGINA DE HISTORIA (texto + imagen)
// ============================================================
async function addStoryPage(doc, page, settings) {
  doc.addPage({ size: [W, H] });
  doc.rect(0, 0, W, H).fill("#ffffff");

  const imgBuf = await fetchImageBuffer(page.imageUrl);
  const imgH   = H * 0.58; // 58% imagen

  if (imgBuf) {
    // Imagen superior con bordes redondeados simulados (recortando)
    doc.save();
    doc.roundedRect(MARGIN, MARGIN, W - MARGIN * 2, imgH - MARGIN, 10).clip();
    doc.image(imgBuf, MARGIN, MARGIN, {
      fit: [W - MARGIN * 2, imgH - MARGIN],
      align: "center",
      valign: "center"
    });
    doc.restore();
  } else {
    // Placeholder gradiente
    doc
      .roundedRect(MARGIN, MARGIN, W - MARGIN * 2, imgH - MARGIN, 10)
      .fill("#eef2f7");
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLOR_MUTED)
      .text("Ilustración", 0, MARGIN + (imgH - MARGIN) / 2 - 6, {
        width: W,
        align: "center"
      });
  }

  // Caja de texto inferior
  const textBoxColor = settings?.textBoxColor || "#f9fafb";
  const textY = imgH + 4;
  const textBoxH = H - textY - MARGIN;

  doc
    .roundedRect(MARGIN, textY, W - MARGIN * 2, textBoxH, 8)
    .fill(textBoxColor);

  // Número de página (esquina superior del recuadro)
  if (page.pageNumber) {
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLOR_MUTED)
      .text(`${page.pageNumber}`, W - MARGIN - 18, textY + 6, {
        width: 14,
        align: "right"
      });
  }

  // Texto del cuento
  const text = page.text || "";
  doc
    .font("Helvetica")
    .fontSize(13)
    .fillColor(COLOR_TEXT)
    .text(text, MARGIN + 12, textY + 16, {
      width: W - MARGIN * 2 - 24,
      align: "justify",
      lineGap: 4
    });
}

// ============================================================
//  PÁGINA DE TEXTO (índice, guía adultos, ONG, cierre)
// ============================================================
async function addTextPage(doc, page) {
  doc.addPage({ size: [W, H] });
  doc.rect(0, 0, W, H).fill("#ffffff");

  const imgBuf = page.imageUrl ? await fetchImageBuffer(page.imageUrl) : null;

  // Cabecera por tipo
  const headers = {
    "closing":     { label: "Cierre emocional", color: "#7c3aed", icon: "🌈" },
    "adult-guide": { label: "Guía para quien acompaña", color: "#0e7490", icon: "📘" },
    "ngo":         { label: "Sobre la ONG", color: "#15803d", icon: "🤝" }
  };

  const h = headers[page.type];

  if (h) {
    // Barra de color superior
    doc.rect(0, 0, W, 8).fill(h.color);

    doc
      .font("Helvetica-Bold")
      .fontSize(15)
      .fillColor(h.color)
      .text(h.label, MARGIN, MARGIN + 16, {
        width: W - MARGIN * 2
      });

    // Línea decorativa
    doc
      .moveTo(MARGIN, MARGIN + 38)
      .lineTo(W - MARGIN, MARGIN + 38)
      .strokeColor(h.color + "44")
      .lineWidth(1)
      .stroke();
  }

  const startY = h ? MARGIN + 50 : MARGIN;

  // Imagen si existe (closing puede tenerla)
  let textStartY = startY;
  if (imgBuf && page.type === "closing") {
    const imgH = H * 0.4;
    doc.image(imgBuf, MARGIN, startY, {
      width: W - MARGIN * 2,
      height: imgH,
      cover: [W - MARGIN * 2, imgH]
    });
    textStartY = startY + imgH + 12;
  }

  // Texto
  const text = page.text || "";
  doc
    .font("Helvetica")
    .fontSize(12)
    .fillColor(COLOR_TEXT)
    .text(text, MARGIN, textStartY, {
      width: W - MARGIN * 2,
      align: "left",
      lineGap: 5
    });
}

// ============================================================
//  AÑADIR NÚMERO DE PÁGINA GLOBAL (pie de página)
// ============================================================
function addPageNumber(doc, pageNum) {
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLOR_MUTED)
    .text(String(pageNum), 0, H - 20, { width: W, align: "center" });
}

// ============================================================
//  FUNCIÓN PRINCIPAL: generatePdf
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

  const pages   = bookData?.pages   || [];
  const stories = bookData?.stories || [];
  const settings = bookData?.settings || {};

  let globalPageNum = 0;

  for (const page of pages) {

    if (page.type === "blank") {
      addBlankPage(doc, page.color || settings.blankPageColor || "#ffffff");
      continue;
    }

    globalPageNum++;

    if (page.type === "cover") {
      await addCoverPage(doc, page, {
        bookTitle: bookData?.meta?.bookTitle,
        bookSubtitle: bookData?.meta?.bookSubtitle,
        ...settings
      });

    } else if (page.type === "index") {
      addIndexPage(doc, page);
      addPageNumber(doc, globalPageNum);

    } else if (page.type === "story-cover") {
      const storyIdx = stories.findIndex(s => s.id === page.storyId);
      await addStoryCoverPage(doc, page, storyIdx >= 0 ? storyIdx : 0);

    } else if (page.type === "story") {
      await addStoryPage(doc, page, settings);
      addPageNumber(doc, globalPageNum);

    } else if (["closing", "adult-guide", "ngo"].includes(page.type)) {
      await addTextPage(doc, page);
      addPageNumber(doc, globalPageNum);

    } else {
      // Página genérica (fallback)
      doc.addPage({ size: [W, H] });
      doc.rect(0, 0, W, H).fill("#ffffff");
      if (page.text) {
        doc
          .font("Helvetica")
          .fontSize(12)
          .fillColor(COLOR_TEXT)
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
//  FUNCIÓN: generateCoverPdf (solo portada, ratio extendido)
// ============================================================
export async function generateCoverPdf(bookData) {

  const PAGE_COUNT = 68;
  const PAPER_FACTOR = 0.002252;

  const BLEED = 0.125 * 72;
  const TRIM_W = 6 * 72;
  const TRIM_H = 9 * 72;

  const spineWidth = PAGE_COUNT * PAPER_FACTOR * 72;

  const coverWidth = (TRIM_W * 2) + spineWidth + (BLEED * 2);
  const coverHeight = TRIM_H + (BLEED * 2);

  const doc = new PDFDocument({
    size: [coverWidth, coverHeight],
    autoFirstPage: false
  });

  const buffers = [];
  doc.on("data", chunk => buffers.push(chunk));

  doc.addPage({ size: [coverWidth, coverHeight] });

  const coverPage = (bookData?.pages || []).find(p => p.type === "cover");

  const imgBuf = coverPage?.imageUrl
    ? await fetchImageBuffer(coverPage.imageUrl)
    : null;

  const backImgBuf = coverPage?.backImageUrl
    ? await fetchImageBuffer(coverPage.backImageUrl)
    : imgBuf;

  const title = bookData?.meta?.bookTitle || "Título";
  const subtitle = bookData?.meta?.bookSubtitle || "";
  const backText = bookData?.meta?.backCoverText || "";

  const backX = BLEED;
  const spineX = BLEED + TRIM_W;
  const frontX = BLEED + TRIM_W + spineWidth;

  // Fondo general
  doc.rect(0, 0, coverWidth, coverHeight).fill("#ffffff");

  // CONTRAPORTADA
  if (imgBuf) {
    doc.image(imgBuf, backX, BLEED, {
      cover: [TRIM_W, TRIM_H]
      align: "center",
      valign: "bottom"
    });

  } else {
    doc.rect(backX, BLEED, TRIM_W, TRIM_H).fill("#1e3a5f");
  }

  doc.rect(backX + 18, BLEED + 18, TRIM_W - 36, 120)
     .fill("rgba(0,0,0,0.28)");

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#ffffff")
    .text(backText, backX + 30, BLEED + 60, {
      width: TRIM_W - 60,
      lineGap: 4
    });

  // LOMO (sin texto porque es muy fino)
  const spineColor = bookData?.settings?.spineColor || "#1e3a5f";

  doc.rect(spineX, BLEED, spineWidth, TRIM_H).fill(spineColor);

  // PORTADA
  if (imgBuf) {
    doc.image(imgBuf, frontX, BLEED, {
      fit: [TRIM_W, TRIM_H],
      align: "center",
      valign: "center"
    });

  } else {
    doc.rect(frontX, BLEED, TRIM_W, TRIM_H).fill("#1e3a5f");
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
  });
}
