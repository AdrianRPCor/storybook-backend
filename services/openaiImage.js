import OpenAI from "openai";

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY no disponible en runtime");
    throw new Error("OPENAI_API_KEY missing");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

export async function generateImage(prompt, coloring = false) {
  const openai = getClient();

  const finalPrompt = coloring
    ? `${prompt}. Black and white line art, no shading, for children's coloring book`
    : prompt;

  const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt: finalPrompt,
    size: "1024x1024"
  });

  return result.data[0].url;
}
