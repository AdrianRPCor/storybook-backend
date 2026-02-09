import OpenAI from "openai";

export async function generateImage(prompt, coloring = false) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const client = new OpenAI({ apiKey });

  const result = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024",
  });

  return result.data[0].url;
}
