import express from "express";
import { generatePageText } from "../services/editorialOrchestrator.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {

    const { page, story, settings, brain, pages, characters } = req.body;

    if (!page || !settings) {
      return res.status(400).json({ error: "Faltan datos necesarios" });
    }

    const context = {
      pageType: page.type,
      pageNumber: page.pageNumber,
      storyTitle: story?.title,
      theme: story?.theme,
      lesson: story?.lesson,
      characters: settings?.characters || [],
      ageTarget: settings.ageTarget,
      bookTitle: settings.bookTitle,
      previousPageText: page.previousPageText || "",
      nextPageGoal: page.nextPageGoal || ""
    };

    const result = await generatePageText({
      brain,
      page,
      context
    });

    res.json({ text: result.text });

  } catch (err) {
    console.error("❌ Error generando texto:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
