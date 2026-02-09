import express from "express";
import { generateImage } from "../services/openaiImage.js";

const router = express.Router();

/**
 * POST /
 * Body:
 * {
 *   prompt: string,
 *   coloring?: boolean
 * }
 *
 * Response:
 * {
 *   imageUrl: string
 * }
 */
router.post("/", async (req, res) => {
  try {
    const { prompt, coloring = false } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "El prompt de imagen es obligatorio"
      });
    }

    console.log("🖼️ Generando imagen...");
    console.log("Prompt:", prompt);
    console.log("Coloring:", coloring);

    const imageUrl = await generateImage(prompt, coloring);

    if (!imageUrl) {
      throw new Error("No se recibió URL de imagen");
    }

    res.json({ imageUrl });

  } catch (err) {
    console.error("❌ Error generando imagen:", err.message);

    res.status(500).json({
      error: "Error generando imagen",
      details: err.message
    });
  }
});

export default router;
