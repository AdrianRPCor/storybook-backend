import express from "express";
import { generateText } from "../services/openaiText.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Falta el prompt" });
    }

    const text = await generateText(prompt);
    res.json({ text });

  } catch (err) {
    console.error("❌ Texto:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
