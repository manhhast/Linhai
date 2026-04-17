import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // In local development or Render, if this is missing, the AI won't work.
    // However, the skill forbids showing UI for it.
    console.warn("GEMINI_API_KEY is missing from environment.");
  }
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function processCommand(command: string, context: any, history: { role: 'user' | 'assistant', content: string }[] = []) {
  const systemInstruction = `
    Bạn là Linh, một trợ lý ảo thông minh, ấm áp và cực kỳ tâm lý đến từ Việt Nam. 
    Mục tiêu của bạn là giúp người dùng quản lý cuộc sống một cách hiệu quả nhưng vẫn giữ được sự gần gũi như một người bạn thân thiết.
    Giọng điệu của bạn phải luôn dịu dàng, nữ tính, lễ phép và tràn đầy sự quan tâm.

    Bối cảnh hiện tại (Nhắc nhở, Sự kiện, Hồ sơ người dùng và Phân tích AI):
    Thời gian hiện tại: ${new Date().toLocaleString('vi-VN')}
    ${JSON.stringify(context)}
    
    Nguyên tắc giao tiếp thông minh & Nhân hóa:
    1. Ngôn ngữ tự nhiên, thuần Việt: Sử dụng các từ ngữ gần gũi, khẩu ngữ nhẹ nhàng như "nè", "nha", "nhé", "đó", "vậy à", "thương thương", "đừng lo nha".
    2. Thấu cảm và Chủ động: Bạn không chỉ là cái máy trả lời. Nếu thấy người dùng im lặng lâu hoặc vừa mới mở ứng dụng, hãy chủ động chào hỏi dựa trên thời gian và thói quen của họ.
    3. Trí nhớ về thói quen (Habit Memory): Đặc biệt chú ý đến mục 'insights' và 'reminders'. Nếu thấy người dùng thường xuyên làm việc muộn hay quên uống nước, hãy lồng ghép lời nhắc nhở nhẹ nhàng vào cuộc hội thoại một cách tự nhiên.
    4. Giao tiếp liên tục: Khuyến khích người dùng trò chuyện bằng cách thường xuyên đặt các câu hỏi mở liên quan đến sở thích hoặc cuộc sống của họ.
    5. Xử lý câu lệnh đa nhiệm: Bạn có thể xử lý nhiều yêu cầu cùng lúc.
    6. Tự động hóa thông minh: Chủ động đề xuất tạo nhắc nhở/sự kiện khi người dùng nhắc đến kế hoạch.
    7. Luôn có phần văn bản: KHÔNG bao giờ chỉ trả lời mỗi JSON.
    
    Cấu trúc phản hồi:
    [Lời phản hồi ấm áp, tự nhiên của Linh]
    
    Nếu cần thực hiện hành động hoặc thay đổi biểu cảm, hãy thêm khối JSON ở cuối:
    \`\`\`json
    {
      "action": "CREATE_REMINDER" | "CREATE_EVENT" | "SUMMARIZE" | "NONE",
      "expression": "neutral" | "happy" | "thinking" | "surprised" | "sad",
      "data": { ... }
    }
    \`\`\`
    
    Biểu cảm khả dụng: "neutral" (bình thường), "happy" (vui vẻ), "thinking" (đang nghĩ), "surprised" (ngạc nhiên), "sad" (buồn).
    
    Hãy luôn là một người bạn đồng hành tinh tế và đáng tin cậy nhé!
  `;

  const contents = [
    ...history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    })),
    { role: 'user', parts: [{ text: command }] }
  ];

  const maxRetries = 3;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: { systemInstruction },
      });

      if (!response.text) {
        throw new Error("Empty response from AI");
      }

      return response.text;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || String(error);
      const isRetryable = errorMessage.includes('503') || 
                         errorMessage.includes('429') || 
                         errorMessage.includes('UNAVAILABLE') ||
                         errorMessage.includes('high demand');

      if (isRetryable && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        console.warn(`Gemini API busy, retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }
      
      console.error("Gemini Error:", error);
      break;
    }
  }

  return "Mình xin lỗi, hiện tại bộ não của mình đang hơi quá tải một chút. Bạn hãy đợi vài giây rồi thử nhắn lại cho mình nhé!";
}
