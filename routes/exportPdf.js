// routes/exportPdf.js
import express from "express";
import { generatePdf, generateCoverPdf } from "../services/pdfGenerator.js";

const router = express.Router();

// POST /api/v1/export/pdf/interior
router.post("/interior", async (req, res) => {
  try {
    console.log("📄 Generando PDF interior KDP...");
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
    console.log("🎨 Generando PDF portada KDP...");
    const pdfBuffer = await generateCoverPdf(req.body);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="portada.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ PDF portada:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/export/pdf  (compatibilidad hacia atrás → interior)
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
