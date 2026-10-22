
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://alexwebsitesgit.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Missing DEEPSEEK_API_KEY in Vercel Environment Variables"
      });
    }

    const { prompt } = req.body || {};
    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Please enter a story idea" });
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `Create a short, imaginative story for a simple 2D animation.
Return ONLY valid JSON in this format:
{
  "title": "Story title",
  "scenes": [
    {
      "narration": "One short sentence describing this moment",
      "visualDescription": "Describe the visible characters, setting, objects and action"
    }
  ]
}
Create exactly 3 scenes: beginning, middle and ending.
Vary the setting and characters to match the user's idea.
Use concise narration. Do not return executable code, HTML or JavaScript.`
          },
          { role: "user", content: prompt.trim() }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "DeepSeek request failed"
      });
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: "DeepSeek returned an empty response" });
    }

    const story = JSON.parse(content);
    if (!Array.isArray(story.scenes) || !story.scenes.length) {
      return res.status(502).json({ error: "DeepSeek returned an invalid story" });
    }

    return res.status(200).json({ story });
  } catch (error) {
    return res.status(500).json({ error: "Could not generate the story" });
  }
}
