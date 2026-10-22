
export default async function handler(req, res) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://alexwebsitesgit.github.io"
  );
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

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
      return res.status(400).json({
        error: "Please enter a story idea"
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-OpenRouter-Title": "Story Studio"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content:
                'Create a short story for a 2D animation. Return only valid JSON with this structure: {"title":"Story title","scenes":[{"narration":"Short narration","visualDescription":"Describe the characters, setting, objects and action"}]}. Create exactly 3 scenes: beginning, middle and ending. Adapt the story to the user idea. Do not return code or Markdown.'
            },
            {
              role: "user",
              content: prompt.trim()
            }
          ],
          response_format: { type: "json_object" },
          max_tokens: 1000,
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data.error?.message ||
          `OpenRouter request failed (${response.status})`
      });
    }

    const choice = data.choices?.[0];
    const content = choice?.message?.content;

    if (!content || typeof content !== "string") {
      return res.status(502).json({
        error:
          choice?.finish_reason === "length"
            ? "The model ran out of response tokens. Try again."
            : "OpenRouter returned an empty response. Try again."
      });
    }

    let story;

    try {
      story = JSON.parse(content);
    } catch {
      return res.status(502).json({
        error: "The model returned invalid JSON. Please try again."
      });
    }

    if (
      !story ||
      typeof story.title !== "string" ||
      !Array.isArray(story.scenes) ||
      story.scenes.length !== 3 ||
      !story.scenes.every(
        scene =>
          typeof scene.narration === "string" &&
          typeof scene.visualDescription === "string"
      )
    ) {
      return res.status(502).json({
        error: "The model returned an incomplete story. Please try again."
      });
    }

    return res.status(200).json({ story });
  } catch (error) {
    return res.status(500).json({
      error: "Could not contact the story service. Please try again."
    });
  }
}
