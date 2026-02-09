import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Rutas
import generateText from "./routes/generateText.js";
import generateImage from "./routes/generateImage.js";
import exportPdf from "./routes/exportPdf.js";

// Cargar variables de entorno
dotenv.config();

// Crear app
const app = express();

/* =====================================================
   CORS — CONFIGURACIÓN CORRECTA PARA FRONTEND
   (esto es lo que te estaba bloqueando todo)
===================================================== */
app.use(
  cors({
    origin: [
      "https://proyectoarena.com",   // dominio real
      "https://www.proyectoarena.com",
      "http://localhost:3000",       // dev
      "http://localhost:5173"        // dev (Vite)
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Preflight (muy importante para Railway + fetch)
app.options("*", cors());

// Middlewares
app.use(express.json({ limit: "10mb" }));

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("Storybook backend activo ✅");
});

// ================================
// RUTAS API
// ================================
app.use("/api/v1/generation", generateText);
app.use("/api/v1/generation", generateImage);
app.use("/api/v1/pdf", exportPdf);

// Puerto
const PORT = process.env.PORT || 3000;

// Arrancar servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend Storybook corriendo en puerto ${PORT}`);
});
