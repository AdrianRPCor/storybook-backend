import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Rutas
import generateText from "./routes/generateText.js";
import generateImage from "./routes/generateImage.js";
import exportPdf from "./routes/exportPdf.js";

dotenv.config();

const app = express();

/* =========================
   LOG GLOBAL (DEBUG)
   — para ver SI LLEGAN
   las peticiones
========================= */
app.use((req, res, next) => {
  console.log("➡️ Request:", req.method, req.url);
  next();
});

/* =========================
   CORS — FORZADO (DEBUG)
   — acepta TODO
========================= */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* =========================
   RESPUESTA EXPLÍCITA
   A PREFLIGHT (OPTIONS)
========================= */
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res.sendStatus(200);
});

/* =========================
   BODY PARSER
========================= */
app.use(express.json({ limit: "10mb" }));

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("Storybook backend activo ✅");
});

/* =========================
   API v1 — EXACTAMENTE
   lo que usa el FRONT
========================= */
app.use("/api/v1/generation/chapter-content", generateText);
app.use("/api/v1/generation/scene", generateImage);
app.use("/api/v1/export/pdf", exportPdf);

/* =========================
   START
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Backend corriendo en puerto:", PORT);
});
