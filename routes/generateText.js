import express from "express";
import { generatePageText } from "../services/editorialOrchestrator.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {

    const { page, story, settings, brain, pages, characters } = req.body;

    if (!page || !settings || !pages) {
      return res.status(400).json({
        error: "Missing required fields",
        received: Object.keys(req.body || {})
      });
    }

    const result = await generatePageText({
      page,
      story,
      settings,
      brain,
      pages,
      characters
    });

    res.json({ text: result.text });

  } catch (err) {
    console.error("❌ Error generando texto:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
