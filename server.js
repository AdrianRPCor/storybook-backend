import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import generateText from "./routes/generateText.js";
import generateImage from "./routes/generateImage.js";
import exportPdf from "./routes/exportPdf.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.send("Storybook backend activo ✅");
});

app.use("/api/text", generateText);
app.use("/api/image", generateImage);
app.use("/api/pdf", exportPdf);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Backend corriendo en puerto", PORT);
});
