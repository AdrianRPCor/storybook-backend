// routes/exportPdf.js
import express from "express";
import { generatePdf, generateCoverPdf } from "../services/pdfGenerator.js";

const router = express.Router();

// ── Helper de diagnóstico ──────────────────────────────────
function diagnoseCoverPayload(bookData) {
  const coverPage = (bookData?.pages || []).find(p => p.type === "cover");
  console.log("📋 DIAGNÓSTICO PORTADA:");
  console.log("  meta.bookTitle:",       bookData?.meta?.bookTitle     || "⚠️ VACÍO");
  console.log("  meta.bookSubtitle:",    bookData?.meta?.bookSubtitle  || "⚠️ VACÍO");
  console.log("  meta.backCoverText:",   bookData?.meta?.backCoverText ? `✅ ${bookData.meta.backCoverText.slice(0,50)}…` : "⚠️ VACÍO");
  console.log("  meta.spineText:",       bookData?.meta?.spineText     || "(usa título)");
  console.log("  meta.spineColor:",      bookData?.settings?.spineColor || "#1e3a5f");
  console.log("  coverPage found:",      coverPage ? "✅" : "❌ NO HAY PÁGINA COVER");
  console.log("  coverPage.backText:",   coverPage?.backText  ? `✅ ${coverPage.backText.slice(0,40)}…` : "⚠️ VACÍO");
  console.log("  coverPage.imageUrl:",   coverPage?.imageUrl  ? `✅ ${coverPage.imageUrl.slice(0,40)}…` : "❌ SIN IMAGEN PORTADA");
  console.log("  coverPage.backImageUrl:",coverPage?.backImageUrl ? `✅ ${coverPage.backImageUrl.slice(0,40)}…` : "❌ SIN IMAGEN CONTRAPORTADA");
  console.log("  pages.length:",         (bookData?.pages || []).length);
  console.log("  meta.logoUrl:",         bookData?.meta?.logoUrl ? "✅ presente" : "❌ sin logo");
}

// POST /api/v1/export/pdf/interior
router.post("/interior", async (req, res) => {
  try {
    console.log("📄 Generando PDF interior KDP…");
    console.log("  Páginas recibidas:", (req.body?.pages || []).length);
    const pdfBuffer = await generatePdf(req.body);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="interior.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ PDF interior:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/export/pdf/cover
router.post("/cover", async (req, res) => {
  try {
    console.log("🎨 Generando PDF portada KDP…");
    diagnoseCoverPayload(req.body);
    const pdfBuffer = await generateCoverPdf(req.body);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="portada.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ PDF portada:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/export/pdf  → interior (compatibilidad)
router.post("/", async (req, res) => {
  try {
    const pdfBuffer = await generatePdf(req.body);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="libro.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
