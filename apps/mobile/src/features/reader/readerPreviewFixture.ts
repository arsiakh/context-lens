import type { AnalyzeResponse } from "../../types";

const normalizedText =
  "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.\n\n" +
  "However little known the feelings or views of such a man may be on his first entering a neighbourhood, he is considered the rightful property of some one or other of their daughters.\n\n" +
  "My dear Mr. Bennet, said his lady to him one day, have you heard that Netherfield Park is let at last?";

function range(fragment: string) {
  const start = normalizedText.indexOf(fragment);
  if (start < 0) throw new Error(`Missing reader preview fragment: ${fragment}`);
  return { start, end: start + fragment.length };
}

export const readerPreviewFixture: AnalyzeResponse = {
  normalizedText,
  bookInference: {
    title: "Pride & Prejudice — Chapter 1",
    confidence: 0.98,
  },
  vocab: [
    {
      ...range("universally acknowledged"),
      term: "universally acknowledged",
      pos: "adverb + adjective",
      definition: "Accepted or recognized by everyone without question.",
      example: "It is universally acknowledged that great art transcends its time.",
    },
  ],
  realWorldRefs: [
    {
      ...range("he is considered the rightful property of some one or other of their daughters"),
      label: "Regency marriage economics",
      explanation:
        "Marriage was often a woman’s primary route to financial security and social standing in Regency-era England.",
      confidence: 0.94,
    },
  ],
  inBookRefs: [
    {
      ...range("My dear Mr. Bennet"),
      label: "Plot foundation — Chapter 1",
      explanation:
        "Mrs. Bennet’s opening question establishes her determination to arrange advantageous marriages for her daughters.",
      confidence: 0.96,
    },
  ],
  meta: {
    model: "gpt-4o-mini",
    latencyMs: 640,
    fallbackUsed: false,
  },
};

export const readerPreviewAuthor = "Jane Austen, 1813";
