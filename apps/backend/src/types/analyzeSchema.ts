import { z } from "zod";

// Zod is a runtime schema validator — it checks actual data at runtime, not just at compile time.
// TypeScript interfaces (like in mobile/src/types/) only exist during development.
// Zod schemas exist at runtime and can reject bad data from the LLM before it reaches the client.

// Each z.object() defines the required shape. If any field is missing or the wrong type,
// Zod throws a detailed error telling you exactly which field failed and why.

const vocabItemSchema = z.object({
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  term: z.string().min(1),
  pos: z.string().min(1),
  definition: z.string().min(1),
  example: z.string().min(1),
});

const inBookRefSchema = z.object({
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  label: z.string().min(1),
  explanation: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

const realWorldRefSchema = z.object({
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  label: z.string().min(1),
  explanation: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

// The full schema matching AnalyzeResponse from the Tech Spec Section 4.1.
// z.enum() restricts model to only the two valid string values — anything else is rejected.
export const analyzeResponseSchema = z.object({
  normalizedText: z.string().min(20),
  bookInference: z.object({
    title: z.string().nullable(), // nullable() allows string OR null
    confidence: z.number().min(0).max(1),
  }),
  vocab: z.array(vocabItemSchema),
  inBookRefs: z.array(inBookRefSchema),
  realWorldRefs: z.array(realWorldRefSchema),
  meta: z.object({
    model: z.enum(["gpt-4o-mini", "gpt-4o"]),
    latencyMs: z.number().min(0),
    fallbackUsed: z.boolean(),
  }),
});

// Infer the TypeScript type directly from the Zod schema.
// This means the schema and the type are always in sync — change one, the other updates.
// No risk of the Zod schema drifting from the TypeScript interface.
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
