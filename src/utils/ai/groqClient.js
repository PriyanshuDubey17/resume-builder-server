const Groq = require("groq-sdk");
const ApiError = require("../ApiError");

const REQUEST_TIMEOUT_MS = 30000;
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const DEFAULT_FALLBACK_MODEL = "qwen/qwen3.6-27b";

const createGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new ApiError("AI service is not configured.", 500);
  }
  return new Groq({
    apiKey: process.env.GROQ_API_KEY,
    timeout: REQUEST_TIMEOUT_MS,
  });
};

const getModelCandidates = () => {
  const primary = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  const fallback = process.env.GROQ_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
  if (fallback && fallback !== primary) return [primary, fallback];
  return [primary];
};

const mapProviderError = (error) => {
  const statusCode = error?.status || error?.response?.status;
  if (statusCode === 429) {
    return new ApiError("AI service is busy. Please try again in a moment.", 429);
  }
  if (statusCode >= 500) {
    return new ApiError("AI service is temporarily unavailable.", 502);
  }
  if (error instanceof ApiError) return error;
  return new ApiError("AI request failed. Please try again.", 502);
};

const callGroqJson = async (systemPrompt, userPrompt) => {
  const client = createGroqClient();
  const models = getModelCandidates();
  let lastError = null;

  for (const model of models) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      return completion?.choices?.[0]?.message?.content;
    } catch (error) {
      lastError = error;
      if ((error?.status || error?.response?.status) === 429) {
        throw mapProviderError(error);
      }
    }
  }

  throw mapProviderError(lastError);
};

module.exports = { callGroqJson, mapProviderError };
