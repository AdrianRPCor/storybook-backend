import OpenAI from "openai";
import { v2 as cloudinary } from "cloudinary";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function generateImage(prompt, coloring = false) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("Prompt inválido en generateImage");
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Faltan variables de Cloudinary en Railway");
  }

  const finalPrompt = coloring
    ? `Ilustración infantil para libro para colorear, líneas negras limpias, sin relleno de color, fondo blanco. ${prompt}`
    : `Ilustración infantil estilo cuento, suave, amigable, colores cálidos, coherente entre escenas. ${prompt}`;

  try {
    console.log("🎨 Generando imagen con OpenAI...");

    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt: finalPrompt,
      size: "1024x1024"
    });

    const image = result?.data?.[0];

    if (!image) {
      throw new Error("Respuesta inválida de la API de imágenes");
    }

    // Si OpenAI devuelve URL directa, la subimos igual a Cloudinary
    if (image.url) {
      console.log("☁️ Subiendo imagen URL a Cloudinary...");

      const uploadResult = await cloudinary.uploader.upload(image.url, {
        folder: "storybook"
      });

      console.log("✅ Imagen subida a Cloudinary");
      return uploadResult.secure_url;
    }

    // Si OpenAI devuelve base64, la subimos a Cloudinary
    if (image.b64_json) {
      console.log("☁️ Subiendo imagen base64 a Cloudinary...");

      const dataUri = `data:image/png;base64,${image.b64_json}`;

      const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: "storybook"
      });

      console.log("✅ Imagen subida a Cloudinary");
      return uploadResult.secure_url;
    }

    throw new Error("La imagen no contiene url ni base64");
  } catch (error) {
    console.error("❌ Error generando/subiendo imagen:", error.message);
    throw error;
  }
}
