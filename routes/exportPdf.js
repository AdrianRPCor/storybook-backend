import express from "express";
import { generatePdf } from "../services/pdfGenerator.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const pdfBuffer = await generatePdf(req.body);
    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
