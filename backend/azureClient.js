import axios from "axios";

const endpoint = process.env.AZURE_ENDPOINT?.replace(/\/$/, "");
const deployment = process.env.AZURE_DEPLOYMENT;
const apiKey = process.env.AZURE_API_KEY;
const apiVersion = process.env.AZURE_API_VERSION;

const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

export async function callAzure({ system, user, images = [], temperature = 0.4, maxTokens = 1800 }) {
  const userContent = [{ type: "text", text: user }];
  for (const img of images) {
    userContent.push({
      type: "image_url",
      image_url: { url: img, detail: "high" },
    });
  }

  const body = {
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    temperature,
    max_tokens: maxTokens,
  };

  try {
    const { data } = await axios.post(url, body, {
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      timeout: 120000,
    });
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    const detail = err.response?.data || err.message;
    throw new Error(`Azure OpenAI call failed: ${JSON.stringify(detail)}`);
  }
}
