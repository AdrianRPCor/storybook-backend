import express from "express";
import { generateText } from "../services/openaiText.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { prompt } = req.body;
    const text = await generateText(prompt);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
