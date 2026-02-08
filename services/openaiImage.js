import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateImage(prompt, coloring = false) {
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
