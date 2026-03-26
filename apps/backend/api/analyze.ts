import type { VercelRequest, VercelResponse } from "@vercel/node";

// Vercel Node.js functions use Express-style (req, res) — NOT Web API (Request) => Response.
// Web API style only works in Edge Runtime or Next.js.
// 'async' is here for when we add the real OpenAI await call in Week 3.
export default async function handler(req: VercelRequest, res: VercelResponse) {

  // Guard clause: only accept POST requests.
  // If someone hits this with GET (e.g. typing the URL in a browser), return 405 immediately.
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Hardcoded fake response matching the AnalyzeResponse shape from src/types/index.ts.
  // This lets the mobile app talk to a real endpoint before the LLM is connected (Week 3).
  // Uses A Tale of Two Cities so the data is meaningful and testable.
  const stub = {
    // The passage the client renders highlights against.
    // Character offsets in vocab/inBookRefs/realWorldRefs are relative to THIS string.
    normalizedText:
      "It was the best of times, it was the worst of times, it was the age of wisdom.",

    // The guessed book title and confidence score (0.0–1.0).
    // If confidence < 0.70, the mobile app will show the manual entry modal.
    bookInference: {
      title: "A Tale of Two Cities",
      confidence: 0.95,
    },

    // Words to highlight yellow. start/end are 0-based character offsets into normalizedText.
    // start: 56, end: 63 → characters 56–63 in normalizedText spell "wisdom".
    vocab: [
      {
        start: 56,
        end: 63,
        term: "wisdom",
        pos: "noun",
        definition: "The quality of having experience, knowledge, and good judgement.",
        example: "She spoke with great wisdom about the challenges ahead.",
      },
    ],

    // No in-book references in this stub (empty array is valid).
    inBookRefs: [],

    // Real-world references — rendered as bold text.
    // Tapping opens a bottom sheet with the label + historical explanation.
    realWorldRefs: [
      {
        start: 3,
        end: 25,
        label: "best of times / worst of times",
        explanation:
          "An allusion to the French Revolution era (1789–1799), a period of radical political change in France.",
        confidence: 0.88,
      },
    ],

    // Metadata about the LLM call — model used, latency, whether GPT-4o fallback fired.
    // latencyMs is 0 here since no real LLM call is made in the stub.
    meta: {
      model: "gpt-4o-mini",
      latencyMs: 0,
      fallbackUsed: false,
    },
  };

  // Send the stub back as JSON with HTTP 200.
  res.json(stub);
}
