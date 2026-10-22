
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://alexwebsitesgit.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing API key in server settings" });
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
            content: "Create a short 2D animated story plan. Return only valid JSON with a title and scenes array. Each scene must have a narration string and a visualDescription string. Do not return executable code."
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

    return res.status(200).json({
      story: JSON.parse(data.choices[0].message.content)
    });
  } catch (error) {
    return res.status(500).json({ error: "Could not generate the story" });
  }
}
