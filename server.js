import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import generateText from "./routes/generateText.js";
import generateImage from "./routes/generateImage.js";
import exportPdf from "./routes/exportPdf.js";

dotenv.config();

const app = express();

/* =========================
   LOG GLOBAL (DEBUG REAL)
========================= */
app.use((req, res, next) => {
  console.log("➡️", req.method, req.originalUrl);
  next();
});

/* =========================
   CORS — FORMA CORRECTA
   (una sola vez, global)
========================= */
app.use(
  cors({
    origin: true, // refleja el origin automáticamente
    credentials: false,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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
   API v1
========================= */
app.use("/api/v1/generation/chapter-content", generateText);
app.use("/api/v1/generation/scene", generateImage);
app.use("/api/v1/export/pdf", exportPdf);

/* =========================
   START
========================= */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("🚀 Backend corriendo en puerto:", PORT);
});
