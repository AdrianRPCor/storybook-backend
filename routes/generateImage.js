import express from "express";
import { generateImage } from "../services/openaiImage.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { prompt, coloring = false } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Falta el prompt de imagen" });
    }

    console.log("🖼️ Generando imagen:", prompt);

    const imageUrl = await generateImage(prompt, coloring);
    res.json({ imageUrl });

  } catch (err) {
    console.error("❌ Imagen:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
