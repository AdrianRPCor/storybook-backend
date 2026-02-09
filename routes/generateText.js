import express from "express";
import { generateTextService } from "../services/generateTextService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { prompt } = req.body;
    const text = await generateTextService(prompt);
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error generando texto" });
  }
});

export default router;
