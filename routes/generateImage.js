import express from "express";
import { generateImage } from "../services/openaiImage.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { prompt, coloring } = req.body;
    const imageUrl = await generateImage(prompt, coloring);
    res.json({ imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
