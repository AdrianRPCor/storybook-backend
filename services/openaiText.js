console.log("OPENAI_API_KEY EXISTS:", !!process.env.OPENAI_API_KEY);

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateText(prompt) {
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: prompt
  });

  return response.output_text;
}
