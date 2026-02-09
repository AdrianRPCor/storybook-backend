import OpenAI from "openai";

export async function generateText(prompt) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY no está disponible en runtime");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "user", content: prompt }
    ]
  });

  return response.choices[0].message.content;
}
