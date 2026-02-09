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
   CORS — DEFINITIVO
   (navegador + Railway)
========================= */
const corsOptions = {
  origin: "*", // ⚠️ DEBUG: permitir todos los dominios
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

/* =========================
   PREFLIGHT (OPTIONS)
   — CLAVE PARA CORS
========================= */
app.options("*", cors(corsOptions));

/* =========================
   BODY PARSER
========================= */
app.use(express.json({ limit: "10mb" }));

/* =========================
   LOG GLOBAL (DEBUG REAL)
========================= */
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("Storybook backend activo ✅");
});

/* =========================
   API v1 — FRONTEND
========================= */
app.use("/api/v1/generation/chapter-content", generateText);
app.use("/api/v1/generation/scene", generateImage);
app.use("/api/v1/export/pdf", exportPdf);

/* =========================
   START (Railway)
========================= */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("🚀 Backend corriendo en puerto:", PORT);
});
