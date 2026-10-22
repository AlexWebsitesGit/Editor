
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://alexwebsitesgit.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing OPENROUTER_API_KEY in Vercel"
      });
    }

    const { prompt } = req.body || {};

    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Please enter a story idea" });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-OpenRouter-Title": "Story Studio"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content: `Create a short story for a 2D animation.
Return only valid JSON in this format:
{
  "title": "Story title",
  "scenes": [
    {
      "narration": "Short narration",
      "visualDescription": "Describe the characters, setting, objects and action"
    }
  ]
}
Create exactly 3 scenes: beginning, middle and ending.
Adapt characters and settings to the user's idea.
Never return executable code.`
            },
            {
              role: "user",
              content: prompt.trim()
            }
          ],
          max_tokens: 700,
          temperature: 0.8
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "OpenRouter request failed"
      });
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({
        error: "The selected model returned no story"
      });
    }

    const story = JSON.parse(content);

    if (!Array.isArray(story.scenes) || story.scenes.length === 0) {
      return res.status(502).json({
        error: "The model returned an invalid story"
      });
    }

    return res.status(200).json({ story });
  } catch (error) {
    return res.status(500).json({
      error: "Could not generate the story. Try again."
    });
  }
}
