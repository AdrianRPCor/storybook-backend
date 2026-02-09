import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Rutas
import generateText from "./routes/generateText.js";
import generateImage from "./routes/generateImage.js";
import exportPdf from "./routes/exportPdf.js";

dotenv.config();

const app = express();

/* ======================================================
   CORS — CONFIGURACIÓN CORRECTA (CLAVE)
====================================================== */
app.use(cors({
  origin: [
    "https://proyectoarena.com",
    "https://www.proyectoarena.com",
    "http://localhost:3000",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

// PRE-FLIGHT (MUY IMPORTANTE)
app.options("*", cors());

/* ======================================================
   MIDDLEWARES
====================================================== */
app.use(express.json({ limit: "10mb" }));

/* ======================================================
   HEALTH CHECK
====================================================== */
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Storybook backend activo ✅" });
});

/* ======================================================
   RUTAS — COINCIDEN CON EL FRONT
====================================================== */
app.use("/api/v1/generation/chapter-content", generateText);
app.use("/api/v1/generation/scene", generateImage);
app.use("/api/v1/pdf", exportPdf);

/* ======================================================
   START
====================================================== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en puerto ${PORT}`);
});
