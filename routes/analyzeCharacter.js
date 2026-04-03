// routes/analyzeCharacter.js
import express from "express";
import { analyzeCharacterImage, generateCharacterPromptFromDescription } from "../services/characterAnalyzer.js";

const router = express.Router();

// POST /api/v1/character/analyze
// Body: { imageUrl, name, description, style, palette }
// Devuelve: { promptDescription }
router.post("/analyze", async (req, res) => {
  try {
    const { imageUrl, name, description, style, palette } = req.body;

    if (!imageUrl && !description) {
      return res.status(400).json({ error: "Se necesita imageUrl o description" });
    }

    let result;
    if (imageUrl) {
      console.log(`🔍 Analizando imagen del personaje: ${name}`);
      result = await analyzeCharacterImage({ imageUrl, name, description, style, palette });
    } else {
      console.log(`📝 Generando prompt desde descripción: ${name}`);
      result = await generateCharacterPromptFromDescription({ name, description, style, palette });
    }

    res.json(result);
  } catch (err) {
    console.error("❌ Error en /character/analyze:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
