import { GoogleGenAI, Type } from "@google/genai";
import { Word } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateDailyWords(): Promise<Word[]> {
  const today = new Date().toISOString().split('T')[0];
  
  const prompt = `Generate 5 high-quality, interesting vocabulary words for today (${today}). Each word should include its part of speech, definition, and an illustrative example sentence. Choose words that are educational but useful for advanced learners (e.g., GRE level or slightly specialized).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              definition: { type: Type.STRING },
              example: { type: Type.STRING },
              part_of_speech: { type: Type.STRING },
              pronunciation: { type: Type.STRING, description: "A phonetic guide like 'pro-NUN-see-AY-shun'" },
            },
            required: ["word", "definition", "example", "part_of_speech"],
          },
        },
      },
    });

    const result = JSON.parse(response.text);
    return result.map((w: any) => ({
      ...w,
      date_shown: today
    }));
  } catch (error) {
    console.error("Gemini failed to generate words:", error);
    return FALLBACK_WORDS;
  }
}

export async function generateRandomWord(): Promise<Word> {
  const prompt = `Generate one high-quality, sophisticated, and rare vocabulary word. Include its part of speech, definition, an illustrative example sentence, and a phonetic guide. Choose a word that is interesting and not commonly known but very useful for an advanced vocabulary.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            definition: { type: Type.STRING },
            example: { type: Type.STRING },
            part_of_speech: { type: Type.STRING },
            pronunciation: { type: Type.STRING },
          },
          required: ["word", "definition", "example", "part_of_speech"],
        },
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini failed to generate random word:", error);
    return FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
  }
}

const FALLBACK_WORDS: Word[] = [
  {
    word: "Ephemeral",
    definition: "Lasting for a very short time.",
    example: "The beauty of the sunset was ephemeral, fading into darkness within minutes.",
    part_of_speech: "Adjective",
    pronunciation: "ih-FEM-er-ul"
  },
  {
    word: "Eloquent",
    definition: "Fluent or persuasive in speaking or writing.",
    example: "The diplomat gave an eloquent speech that moved the entire assembly.",
    part_of_speech: "Adjective",
    pronunciation: "EL-uh-kwunt"
  },
  {
    word: "Enigma",
    definition: "A person or thing that is mysterious, puzzling, or difficult to understand.",
    example: "His sudden disappearance remains an enigma to this day.",
    part_of_speech: "Noun",
    pronunciation: "uh-NIG-muh"
  },
  {
    word: "Resilient",
    definition: "Able to withstand or recover quickly from difficult conditions.",
    example: "The community showed its resilient spirit by rebuilding immediately after the storm.",
    part_of_speech: "Adjective",
    pronunciation: "re-ZIL-yent"
  },
  {
    word: "Sagacious",
    definition: "Having or showing keen mental discernment and good judgment; shrewd.",
    example: "The CEO was known for her sagacious decision-making during the financial crisis.",
    part_of_speech: "Adjective",
    pronunciation: "suh-GEY-shuhs"
  }
];
