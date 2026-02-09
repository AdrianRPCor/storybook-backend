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
   CORS — CONFIGURACIÓN REAL
========================= */
app.use(
  cors({
    origin: [
      "https://proyectoarena.com",
      "http://localhost:3000",
      "http://localhost:5173"
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// IMPORTANTE para preflight
app.options("*", cors());

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
