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

export async function generateText(prompt) {
  const openai = getClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }]
  });

  return response.choices[0].message.content;
}
