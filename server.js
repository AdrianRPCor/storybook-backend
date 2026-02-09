import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import generateText from "./routes/generateText.js";
import generateImage from "./routes/generateImage.js";
import exportPdf from "./routes/exportPdf.js";

/* =========================
   ENV
========================= */
dotenv.config();

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
   CORS (PRODUCCIÓN OK)
========================= */
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* =========================
   BODY
========================= */
app.use(express.json({ limit: "10mb" }));

/* =========================
   HEALTH
========================= */
app.get("/", (_, res) => {
  res.send("Storybook backend activo ✅");
});

/* =========================
   ROUTES
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
