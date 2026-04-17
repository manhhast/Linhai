import { GoogleGenAI, Type } from "@google/genai";
import { Reminder, Event, UserInsight } from "../types";

const getAI = () => {
  const apiKey = (process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY);
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing for Insights.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export async function generateUserInsights(
  userId: string,
  reminders: Reminder[],
  events: Event[],
  chatHistory: string[]
): Promise<Partial<UserInsight>[]> {
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
    
    Return a list of insights in JSON format. The "content" field MUST be in Vietnamese, written in a friendly tone as if observing a close friend.
  `;

  try {
    const ai = getAI();
    if (!ai) return [];
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
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

    if (!response.text) {
      throw new Error("Empty response from Learning AI");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error generating insights:", error);
    return [];
  }
}
