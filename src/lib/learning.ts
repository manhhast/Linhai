import { GoogleGenAI, Type } from "@google/genai";
import { Reminder, Event, UserInsight } from "../types";

let aiClient: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }
  return aiClient;
};

export async function generateUserInsights(
  userId: string,
  reminders: Reminder[],
  events: Event[],
  chatHistory: string[]
): Promise<Partial<UserInsight>[]> {
  const ai = getAI();
  const prompt = `
    Analyze the following user data to identify deep habits, personal preferences, and provide highly relevant, proactive suggestions.
    
    Reminders: ${JSON.stringify(reminders)}
    Events: ${JSON.stringify(events)}
    Recent Chat History:
    ${chatHistory.join("\n")}
    
    Instructions:
    1. Look for patterns in the user's schedule (e.g., when they are most active, what kind of tasks they prioritize).
    2. Pay close attention to the Chat History. Identify:
       - Explicit preferences mentioned (e.g., "I like to work in the evening").
       - Recurring topics or concerns.
       - Emotional tone regarding certain tasks or times.
       - Locations or people mentioned frequently.
    3. Synthesize this data to create:
       - Habits: Observations about recurring behaviors.
       - Preferences: Things the user likes or dislikes.
       - Suggestions: Actionable advice that Linh (the AI) can offer proactively in future conversations.
    
    Return a list of insights in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ["habit", "preference", "suggestion"] },
              content: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            },
            required: ["type", "content", "confidence"]
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error generating insights:", error);
    return [];
  }
}
