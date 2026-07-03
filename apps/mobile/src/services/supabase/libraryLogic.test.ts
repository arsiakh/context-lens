import type { AnalyzeResponse } from "../../types";
import { getNotePreview, sortBooksByTitle, toBook, toNote } from "./libraryLogic";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  console.log(`${condition ? "PASS ✓" : "FAIL ✗"} ${name}`);
  if (condition) passed++;
  else failed++;
}

const annotations: AnalyzeResponse = {
  normalizedText: "Call me Ishmael. Some years ago.",
  bookInference: { title: "Moby-Dick", confidence: 0.9 },
  vocab: [],
  inBookRefs: [],
  realWorldRefs: [],
  meta: { model: "gpt-4o-mini", latencyMs: 100, fallbackUsed: false },
};

const book = toBook({
  id: "book-1",
  user_id: "user-1",
  title: "Moby-Dick",
  created_at: "2026-07-03T10:00:00Z",
});
check("maps book row to app type", book.id === "book-1" && book.userId === "user-1" && book.createdAt.includes("2026"));

const note = toNote({
  id: "note-1",
  user_id: "user-1",
  book_id: "book-1",
  passage_text: annotations.normalizedText,
  annotations,
  schema_version: 1,
  created_at: "2026-07-03T10:01:00Z",
});
check("maps note row to app type", note.bookId === "book-1" && note.schemaVersion === 1 && note.annotations === annotations);

const sorted = sortBooksByTitle([{ title: "zebra" }, { title: "Alpha" }, { title: "moby" }]);
check("sorts books alphabetically case-insensitively", sorted.map((item) => item.title).join(",") === "Alpha,moby,zebra");

check("keeps short previews intact", getNotePreview("  short   passage  ") === "short passage");
check("truncates long previews with ellipsis", getNotePreview("a ".repeat(40), 20) === "a a a a a a a a a a…");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
