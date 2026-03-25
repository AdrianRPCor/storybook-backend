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
//  Fondo: color del usuario (blankPageColor)
//  Imagen decorativa abajo si existe
// ============================================================
async function addIndexPage(doc, page, settings) {
  const bgColor = settings?.blankPageColor || "#ffffff";
  doc.addPage({ size: [W, H] });
  doc.rect(0, 0, W, H).fill(bgColor);

  const imgBuf = page.imageUrl ? await fetchImageBuffer(page.imageUrl) : null;

  // Imagen decorativa en parte inferior (personajes)
  if (imgBuf) {
    const imgHeight = H * 0.32;
    const imgY = H - imgHeight;
    doc.save();
    doc.rect(0, imgY, W, imgHeight).clip();
    doc.image(imgBuf, 0, imgY, { cover: [W, imgHeight], align: "center", valign: "top" });
    doc.restore();
    // Degradado suave sobre la imagen para que no corte bruscamente
    doc.rect(0, imgY - 40, W, 40).fill(bgColor);
  }

  const paddingX = MARGIN + 14;
  const contentW = W - paddingX * 2;

  // Título "ÍNDICE"
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(COLOR_TEXT)
    .text("ÍNDICE", 0, MARGIN + 12, { width: W, align: "center" });

  // Línea decorativa
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

      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor(COLOR_TEXT)
        .text(titleText, paddingX, y, { width: contentW - 32, continued: false, ellipsis: false });

      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor(COLOR_MUTED)
        .text(pageNum, W - paddingX - 28, y, { width: 28, align: "right" });

      const titleW = doc.widthOfString(titleText, { font: "Helvetica", fontSize: 12 });
      const dotsX1 = paddingX + titleW + 4;
      const dotsX2 = W - paddingX - 32;
      if (dotsX2 > dotsX1 + 10) {
        doc
          .moveTo(dotsX1, y + 9)
          .lineTo(dotsX2, y + 9)
          .dash(2, { space: 3 })
          .strokeColor("#9ca3af")
          .lineWidth(0.5)
          .stroke()
          .undash();
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
//  Imagen: 62% del alto — más visual, más infantil
//  Texto: párrafos cortos, legibles, fuente más grande
// ============================================================
async function addStoryPage(doc, page, settings) {
  doc.addPage({ size: [W, H] });
  doc.rect(0, 0, W, H).fill("#ffffff");

  const imgBuf = await fetchImageBuffer(page.imageUrl);
  const imgH   = H * 0.62; // 62% imagen — más espacio visual

  if (imgBuf) {
    doc.save();
    doc.roundedRect(MARGIN, MARGIN, W - MARGIN * 2, imgH - MARGIN, 12).clip();
    doc.image(imgBuf, MARGIN, MARGIN, {
      fit: [W - MARGIN * 2, imgH - MARGIN],
      align: "center",
      valign: "center"
    });
    doc.restore();
  } else {
    doc
      .roundedRect(MARGIN, MARGIN, W - MARGIN * 2, imgH - MARGIN, 12)
      .fill("#eef2f7");
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(COLOR_MUTED)
      .text("Ilustración", 0, MARGIN + (imgH - MARGIN) / 2 - 6, {
        width: W, align: "center"
      });
  }

  // Caja de texto inferior
  const textBoxColor = settings?.textBoxColor || "#f9fafb";
  const textY = imgH + 6;
  const textBoxH = H - textY - MARGIN;

  doc
    .roundedRect(MARGIN, textY, W - MARGIN * 2, textBoxH, 10)
    .fill(textBoxColor);

  // Texto: párrafos separados para facilitar lectura
  const rawText = (page.text || "").trim();
  // Dividir en párrafos (por punto final + espacio o salto de línea)
  const paragraphs = rawText
    .split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÜÑ¿¡"])/)
    .filter(p => p.trim().length > 0);

  let curY = textY + 14;
  const textW = W - MARGIN * 2 - 28;
  const fontSize = 13.5;
  const leading = 7; // espacio entre párrafos

  doc.font("Helvetica").fontSize(fontSize).fillColor(COLOR_TEXT);

  paragraphs.forEach((para, i) => {
    if (curY > H - MARGIN - 20) return; // no desbordar
    doc.text(para.trim(), MARGIN + 14, curY, {
      width: textW,
      align: "justify",
      lineGap: 3
    });
    curY = doc.y + leading;
  });
}

// ============================================================
//  PÁGINA DE TEXTO — diseño limpio infantil editorial
//  closing (Moraleja) / adult-guide (Para quien lee) / ngo (Proyecto Arena)
// ============================================================
async function addTextPage(doc, page, settings) {
  const bgColor = settings?.blankPageColor || "#ffffff";
  doc.addPage({ size: [W, H] });
  doc.rect(0, 0, W, H).fill(bgColor);

  const imgBuf = page.imageUrl ? await fetchImageBuffer(page.imageUrl) : null;

  const configs = {
    "closing": {
      title: "Moraleja",
      fontSize: 14,
      lineGap: 9,
      centered: true,
      italic: true
    },
    "adult-guide": {
      title: "Para quien lee este cuento",
      fontSize: 12,
      lineGap: 6,
      centered: false,
      italic: false
    },
    "ngo": {
      title: "Sobre Proyecto Arena",
      fontSize: 12,
      lineGap: 7,
      centered: false,
      italic: false
    }
  };

  const cfg = configs[page.type] || configs["adult-guide"];

  // ── Título de sección ──
  const titleY = MARGIN + 8;
  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor(COLOR_TEXT)
    .text(cfg.title, MARGIN, titleY, { width: W - MARGIN * 2, align: "center" });

  // Línea decorativa bajo título
  const lineY = titleY + 28;
  doc
    .moveTo(MARGIN + 20, lineY)
    .lineTo(W - MARGIN - 20, lineY)
    .strokeColor("#d1d5db")
    .lineWidth(1)
    .stroke();

  let contentY = lineY + 16;

  // ── Imagen para closing (moraleja) ──
  if (imgBuf && page.type === "closing") {
    const imgH = Math.min(H * 0.38, H - contentY - MARGIN - 80);
    doc.save();
    doc.roundedRect(MARGIN, contentY, W - MARGIN * 2, imgH, 10).clip();
    doc.image(imgBuf, MARGIN, contentY, {
      fit: [W - MARGIN * 2, imgH],
      align: "center", valign: "center"
    });
    doc.restore();
    contentY += imgH + 16;
  }

  // ── Texto limpio (sin markdown) en párrafos cortos ──
  let rawText = (page.text || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")  // quitar **bold**
    .replace(/\*(.*?)\*/g, "$1")        // quitar *italic*
    .replace(/#+ /g, "")                  // quitar ## headings
    .trim();

  // Párrafos: dividir por salto de línea o por punto + mayúscula
  const paragraphs = rawText
    .split(/\n+/)
    .flatMap(p => p.trim() ? [p.trim()] : [])
    .filter(p => p.length > 0);

  const textW = W - MARGIN * 2 - 16;
  doc
    .font(cfg.italic ? "Helvetica-Oblique" : "Helvetica")
    .fontSize(cfg.fontSize)
    .fillColor(COLOR_TEXT);

  paragraphs.forEach(para => {
    if (doc.y > H - MARGIN - 30) return;
    doc.text(para, MARGIN + 8, contentY, {
      width: textW,
      align: cfg.centered ? "center" : "left",
      lineGap: 3
    });
    contentY = doc.y + cfg.lineGap;
    if (contentY > H - MARGIN - 30) return;
  });

  // ── URL para página ONG ──
  if (page.type === "ngo") {
    const urlY = H - MARGIN - 40;
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#1e40af")
      .text("Visítanos en:", MARGIN, urlY, { width: W - MARGIN * 2, align: "center" });
    doc
      .font("Helvetica")
      .fontSize(13)
      .fillColor("#1e40af")
      .text("www.proyectoarena.com", MARGIN, urlY + 18, {
        width: W - MARGIN * 2,
        align: "center",
        link: "https://proyectoarena.com"
      });
  }
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
    // ============================
  // 📐 CÁLCULO PORTADA COMPLETA
  // ============================

  // 👉 DOCUMENTO HORIZONTAL REAL
  const doc = new PDFDocument({
    size: [W, H], // 🔥 IMPORTANTE → interior vuelve a 6x9
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
  // Calcular páginas reales del libro para el grosor del lomo
  const PAGE_COUNT = 68; // Fijo para KDP: grosor estándar tapa dura 68 páginas
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

  const title = (bookData?.meta?.bookTitle || "Título").trim();
  const subtitle = (bookData?.meta?.bookSubtitle || "").trim();
  const backText = (bookData?.meta?.backCoverText || "").trim();
  const spineText = (bookData?.meta?.spineText || title).trim();

  const backX = BLEED;
  const spineX = BLEED + TRIM_W;
  const frontX = BLEED + TRIM_W + spineWidth;

  // Fondo general
  doc.rect(0, 0, coverWidth, coverHeight).fill("#ffffff");

  // ============================================================
  // CONTRAPORTADA
  // ============================================================
  if (backImgBuf) {
    doc.image(backImgBuf, backX, BLEED, {
      cover: [TRIM_W, TRIM_H],
      align: "center",
      valign: "bottom"
    });
  } else {
    doc.rect(backX, BLEED, TRIM_W, TRIM_H).fill("#1e3a5f");
  }

  // Caja semitransparente para el texto de contraportada
  doc
    .roundedRect(backX + 24, BLEED + 24, TRIM_W - 48, 160, 10)
    .fill("rgba(0,0,0,0.45)");

  // Texto contraportada — usar meta o page.backText como fallback
  const coverPageRef = (bookData?.pages || []).find(p => p.type === "cover");
  const effectiveBackText = backText || coverPageRef?.backText || "";

  if (effectiveBackText) {
    doc
      .font("Helvetica-Oblique")
      .fontSize(11)
      .fillColor("#ffffff")
      .text(effectiveBackText, backX + 36, BLEED + 56, {
        width: TRIM_W - 72,
        align: "center",
        lineGap: 4
      });
  }

  // ============================================================
  // LOMO
  // ============================================================
  const spineColor = bookData?.settings?.spineColor || "#1e3a5f";

  doc.rect(spineX, BLEED, spineWidth, TRIM_H).fill(spineColor);

  // Solo poner texto si el lomo no es ridículamente fino
  if (spineWidth > 18 && spineText) {
    let spineFontSize = 10;

    if (spineWidth < 26) spineFontSize = 8;
    if (spineWidth < 22) spineFontSize = 7;

    doc.save();
    doc.translate(spineX + spineWidth / 2, BLEED + TRIM_H / 2);
    doc.rotate(-90);

    doc
      .font("Helvetica-Bold")
      .fontSize(spineFontSize)
      .fillColor("#ffffff")
      .text(spineText, -TRIM_H / 2 + 20, -spineFontSize / 2, {
        width: TRIM_H - 40,
        align: "center"
      });

    doc.restore();
  }

  // ============================================================
  // PORTADA FRONTAL
  // ============================================================
  if (imgBuf) {
    doc.image(imgBuf, frontX, BLEED, {
      cover: [TRIM_W, TRIM_H],
      align: "center",
      valign: "center"
    });

    // Overlay completo inferior con degradado
    doc
      .rect(frontX, BLEED + TRIM_H * 0.52, TRIM_W, TRIM_H * 0.48)
      .fill("rgba(0,0,0,0.50)");
  } else {
    doc.rect(frontX, BLEED, TRIM_W, TRIM_H).fill("#1e3a5f");
  }

  // Calcular altura del título para ajustar el recuadro
  const titleFontSize = title.length > 50 ? 22 : title.length > 35 ? 25 : 28;
  const titleBoxW = TRIM_W - 60;
  const titleBoxX = frontX + 30;

  // Posición vertical del bloque título (en el 62-80% del alto)
  const titleStartY = BLEED + TRIM_H * 0.60;

  // Título portada — más grande e infantil
  doc
    .font("Helvetica-Bold")
    .fontSize(titleFontSize)
    .fillColor("#ffffff")
    .text(title, titleBoxX, titleStartY, {
      width: titleBoxW,
      align: "center",
      lineGap: 5
    });

  // Subtítulo portada
  if (subtitle) {
    const subY = doc.y + 8;
    doc
      .font("Helvetica")
      .fontSize(13)
      .fillColor("rgba(255,255,255,0.90)")
      .text(subtitle, titleBoxX, subY, {
        width: titleBoxW,
        align: "center",
        lineGap: 3
      });
  }

  // Logo ONG — en portada frontal (esquina inferior derecha) y en contraportada (inferior centro)
  const logoUrl = bookData?.meta?.logoUrl || null;
  if (logoUrl) {
    const logoBuf = await fetchImageBuffer(logoUrl);
    if (logoBuf) {
      const logoH = 40;
      const logoW = 80;

      // Portada frontal: esquina inferior derecha
      try {
        doc.image(logoBuf, frontX + TRIM_W - logoW - 18, BLEED + TRIM_H - logoH - 18, {
          fit: [logoW, logoH], align: "right", valign: "bottom"
        });
      } catch(e) { console.warn("Logo portada:", e.message); }

      // Contraportada: parte inferior centrada
      try {
        doc.image(logoBuf, backX + TRIM_W/2 - logoW/2, BLEED + TRIM_H - logoH - 18, {
          fit: [logoW, logoH], align: "center", valign: "bottom"
        });
      } catch(e) { console.warn("Logo contraportada:", e.message); }
    }
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
  });
}
