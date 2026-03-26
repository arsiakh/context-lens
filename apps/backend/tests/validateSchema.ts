import { analyzeResponseSchema } from "../src/types/analyzeSchema";

// --- Test 1: Valid fixture (should PASS) ---
const validFixture = {
  normalizedText:
    "It was the best of times, it was the worst of times, it was the age of wisdom.",
  bookInference: { title: "A Tale of Two Cities", confidence: 0.95 },
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
  inBookRefs: [],
  realWorldRefs: [
    {
      start: 3,
      end: 25,
      label: "best of times / worst of times",
      explanation: "An allusion to the French Revolution era.",
      confidence: 0.88,
    },
  ],
  meta: { model: "gpt-4o-mini" as const, latencyMs: 1200, fallbackUsed: false },
};

const result1 = analyzeResponseSchema.safeParse(validFixture);
console.log("Test 1 (valid fixture):", result1.success ? "PASS ✓" : "FAIL ✗");
if (!result1.success) console.log("  Errors:", result1.error.issues);

// --- Test 2: Missing required fields (should FAIL) ---
const missingFields = {
  normalizedText: "Some text that is long enough to pass.",
  // bookInference is completely missing
  vocab: [],
  inBookRefs: [],
  realWorldRefs: [],
  meta: { model: "gpt-4o-mini", latencyMs: 500, fallbackUsed: false },
};

const result2 = analyzeResponseSchema.safeParse(missingFields);
console.log("Test 2 (missing bookInference):", result2.success ? "FAIL ✗ (should have rejected)" : "PASS ✓ (correctly rejected)");
if (!result2.success) console.log("  Rejected field:", result2.error.issues[0].path.join("."), "—", result2.error.issues[0].message);

// --- Test 3: Wrong types (should FAIL) ---
const wrongTypes = {
  normalizedText: "Some text that is long enough to pass.",
  bookInference: { title: "Some Book", confidence: "high" }, // confidence should be number, not string
  vocab: [],
  inBookRefs: [],
  realWorldRefs: [],
  meta: { model: "gpt-5", latencyMs: 500, fallbackUsed: false }, // "gpt-5" is not a valid model
};

const result3 = analyzeResponseSchema.safeParse(wrongTypes);
console.log("Test 3 (wrong types):", result3.success ? "FAIL ✗ (should have rejected)" : "PASS ✓ (correctly rejected)");
if (!result3.success) {
  result3.error.issues.forEach((issue) => {
    console.log("  Rejected field:", issue.path.join("."), "—", issue.message);
  });
}
