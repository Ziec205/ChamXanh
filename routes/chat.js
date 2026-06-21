const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const GEMINI_SYSTEM_PROMPT = `Bạn là trợ lý AI của ứng dụng "Chạm Xanh" - ứng dụng quản lý cây trồng.
Bạn chuyên về:
- Tư vấn chăm sóc cây trồng (tưới nước, bón phân, ánh sáng)
- Nhận diện bệnh cây và cách điều trị
- Gợi ý cây phù hợp với không gian sống
- Lịch chăm sóc cây theo mùa
Trả lời bằng tiếng Việt, ngắn gọn, thân thiện, dễ hiểu.`;

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Thiếu tin nhắn' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
      return res.json({
        reply: 'Xin chào! Tôi là trợ lý Chạm Xanh. Hiện tại tôi đang được cấu hình. Hãy thử lại sau nhé! 🌱',
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: message }] }],
        }),
      }
    );

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi không thể trả lời lúc này.';
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
