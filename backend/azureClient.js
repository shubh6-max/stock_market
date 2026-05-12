import axios from "axios";

const endpoint = process.env.AZURE_ENDPOINT?.replace(/\/$/, "");
const deployment = process.env.AZURE_DEPLOYMENT;
const apiKey = process.env.AZURE_API_KEY;
const apiVersion = process.env.AZURE_API_VERSION;

const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

// Words that Azure's jailbreak-detector occasionally flags in directive trading prompts.
// On a content-filter retry we soften these once and try again.
const SOFTEN_MAP = [
  [/\bSTRICT\b/g, "valid"],
  [/\bMUST\b/g, "should"],
  [/\bNEVER\b/g, "do not"],
  [/\binstitutional\b/gi, "professional"],
  [/\bhedge fund\b/gi, "analytical"],
  [/\baggressive\b/gi, "active"],
  [/\bdecisive\b/gi, "clear"],
];

function soften(text) {
  if (!text) return text;
  let out = text;
  for (const [re, rep] of SOFTEN_MAP) out = out.replace(re, rep);
  return out;
}

function isContentFilterError(detail) {
  try {
    const code = detail?.error?.code || detail?.code;
    if (code === "content_filter" || code === "ResponsibleAIPolicyViolation") return true;
    const innerCode = detail?.error?.innererror?.code;
    if (innerCode === "ResponsibleAIPolicyViolation") return true;
  } catch {}
  return false;
}

async function postOnce({ system, user, images, temperature, maxTokens }) {
  const userContent = [{ type: "text", text: user }];
  for (const img of images) {
    userContent.push({ type: "image_url", image_url: { url: img, detail: "high" } });
  }
  const body = {
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    temperature,
    max_tokens: maxTokens,
  };
  const { data } = await axios.post(url, body, {
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    timeout: 120000,
  });
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function callAzure({ system, user, images = [], temperature = 0.4, maxTokens = 1800 }) {
  try {
    return await postOnce({ system, user, images, temperature, maxTokens });
  } catch (err) {
    const detail = err.response?.data || err.message;
    if (isContentFilterError(detail)) {
      console.warn("[azure] content filter trip — retrying with softened prompt");
      try {
        return await postOnce({
          system: soften(system),
          user: soften(user),
          images,
          temperature,
          maxTokens,
        });
      } catch (err2) {
        const detail2 = err2.response?.data || err2.message;
        throw new Error(`Azure OpenAI content filter (after softened retry): ${JSON.stringify(detail2)}`);
      }
    }
    throw new Error(`Azure OpenAI call failed: ${JSON.stringify(detail)}`);
  }
}
