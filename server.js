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

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Ruta prueba
app.get("/", (req, res) => {
  res.send("Storybook backend activo ✅");
});

// Rutas principales
app.use("/api/text", generateText);
app.use("/api/image", generateImage);
app.use("/api/pdf", exportPdf);

// Puerto
const PORT = process.env.PORT || 3000;

// Arrancar servidor
app.listen(PORT, () => {
  console.log("🚀 Backend corriendo en puerto:", PORT);
});
