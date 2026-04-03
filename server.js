import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import generateText      from "./routes/generateText.js";
import generateImage    from "./routes/generateImage.js";
import exportPdf        from "./routes/exportPdf.js";
import analyzeCharacter from "./routes/analyzeCharacter.js";

/* =========================
   ENV
========================= */
dotenv.config();

const __dirname      = dirname(fileURLToPath(import.meta.url));
const GENSPARK_TOKEN = process.env.GENSPARK_TOKEN;
const OPENAI_KEY     = process.env.OPENAI_API_KEY;

console.log("🔑 GENSPARK_TOKEN:", GENSPARK_TOKEN ? "✅ presente" : "❌ ausente");
console.log("🔑 OPENAI_API_KEY:", OPENAI_KEY     ? "✅ presente" : "❌ ausente (se usará Genspark)");

/* =========================
   APP
========================= */
const app = express();

/* =========================
   LOG GLOBAL
========================= */
app.use((req, res, next) => {
  console.log("➡️", req.method, req.originalUrl);
  next();
});

/* =========================
   CORS
========================= */
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

/* =========================
   BODY
========================= */
app.use(express.json({ limit: "50mb" }));

/* =========================
   FRONTEND ESTÁTICO
========================= */
app.get("/", (_, res) => {
  const htmlPath = join(__dirname, "index.html");
  if (existsSync(htmlPath)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(readFileSync(htmlPath));
  } else {
    res.json({ status: "✅ Backend activo", engine: GENSPARK_TOKEN ? "Genspark" : "OpenAI" });
  }
});

/* =========================
   API ROUTES
========================= */
app.use("/api/v1/generation/chapter-content", generateText);
app.use("/api/v1/generation/scene",           generateImage);
app.use("/api/v1/export/pdf",                 exportPdf);
app.use("/api/v1/character",                  analyzeCharacter);

/* =========================
   ERROR GLOBAL
========================= */
app.use((err, req, res, _next) => {
  console.error("💥 Error global:", err.message);
  res.status(500).json({ error: err.message });
});

/* =========================
   START
========================= */
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Storybook KDP Backend v2.0 corriendo en puerto ${PORT}`);
  console.log(`🤖 Motor IA: ${GENSPARK_TOKEN ? "Genspark API ✅" : "OpenAI API"}`);
  console.log(`🌐 http://localhost:${PORT}`);
});
