import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";

function getSummaryModel() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const groq = createGroq({ apiKey });
  const modelId = process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
  return groq(modelId);
}

export function isVersionSummaryEnabled(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export async function generateVersionSummary(
  diffDescription: string,
): Promise<string | null> {
  const model = getSummaryModel();
  if (!model) {
    return null;
  }

  try {
    const { text } = await generateText({
      model,
      system:
        "You write one-line summaries for a document version history timeline. " +
        "Describe what changed compared to the previous version. " +
        "Maximum 120 characters. Plain sentence, no quotes or bullet points.",
      prompt: diffDescription,
    });

    const summary = text.trim().replace(/\s+/g, " ");
    if (!summary) {
      return null;
    }

    return summary.length > 200 ? `${summary.slice(0, 197).trimEnd()}…` : summary;
  } catch (error) {
    console.error(
      "[ai] Failed to generate version summary:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export async function generateSelectionSummary(
  selectedText: string,
): Promise<string | null> {
  const model = getSummaryModel();
  if (!model) {
    return null;
  }

  try {
    const { text } = await generateText({
      model,
      system:
        "You help readers understand selected text from a collaborative document. " +
        "Explain or summarize the selection clearly in 2–4 short sentences. " +
        "Use plain language. No markdown, quotes, or bullet lists.",
      prompt: `Selected text:\n\n${selectedText}`,
    });

    const summary = text.trim().replace(/\s+/g, " ");
    return summary || null;
  } catch (error) {
    console.error(
      "[ai] Failed to generate selection summary:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
