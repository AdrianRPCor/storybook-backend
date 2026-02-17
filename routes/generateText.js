import express from "express";
import buildTextPrompt from "../services/promptBuilder.js";
import generateText from "../services/openaiText.js";
import applyTextConstraints from "../services/textConstraints.js";
import postProcessText from "../services/textPostprocess.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {

    const { page, story, settings, brain, pages } = req.body;

    if (!page || !settings) {
      return res.status(400).json({ error: "Faltan datos necesarios" });
    }

    // 1️⃣ Construir prompt estructurado
    const prompt = buildTextPrompt({
      page,
      story,
      settings,
      brain
    });

    // 2️⃣ Generar texto
    let text = await generateText(prompt);

    // 3️⃣ Aplicar límites (longitud, limpieza, etc.)
    text = applyTextConstraints(text, page.type, settings.ageTarget);

    // 4️⃣ Post-procesado final
    text = postProcessText(text);

    res.json({ text });

  } catch (err) {
    console.error("❌ Error generando texto:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
