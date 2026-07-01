import type { AnalyzeResponse } from "../../types";
import {
  SaveError,
  normalizeBookTitle,
  saveBookWithGateway,
  saveNoteWithGateway,
  type InsertNoteInput,
  type SaveGateway,
} from "./saveNoteLogic";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  console.log(`${condition ? "PASS ✓" : "FAIL ✗"} ${name}`);
  if (condition) passed++;
  else failed++;
}

const annotations: AnalyzeResponse = {
  normalizedText: "This passage is long enough to save safely.",
  bookInference: { title: "The Road", confidence: 0.95 },
  vocab: [],
  inBookRefs: [],
  realWorldRefs: [],
  meta: { model: "gpt-4o-mini", latencyMs: 100, fallbackUsed: false },
};

class MemoryGateway implements SaveGateway {
  books = new Map<string, string>();
  notes: InsertNoteInput[] = [];

  async upsertBook(title: string, userId: string) {
    const key = `${userId}:${title.toLocaleLowerCase()}`;
    const existing = this.books.get(key);
    if (existing) return existing;
    const id = `book-${this.books.size + 1}`;
    this.books.set(key, id);
    return id;
  }

  async insertNote(input: InsertNoteInput) {
    this.notes.push(input);
    return `note-${this.notes.length}`;
  }
}

async function run() {
  check("normalizes surrounding and repeated title whitespace", normalizeBookTitle("  The   Road ") === "The Road");

  const gateway = new MemoryGateway();
  const firstBookId = await saveBookWithGateway(gateway, "The Road", "user-1");
  const secondBookId = await saveBookWithGateway(gateway, "the road", "user-1");
  check("case-insensitive saves reuse the same book", firstBookId === secondBookId && gateway.books.size === 1);

  const input = {
    userId: "user-1",
    bookTitle: "The Road",
    passageText: annotations.normalizedText,
    annotations,
  };
  const first = await saveNoteWithGateway(gateway, input);
  const second = await saveNoteWithGateway(gateway, input);
  check("repeated saves create separate notes", first.noteId !== second.noteId && gateway.notes.length === 2);
  check("notes reference the upserted book", gateway.notes.every((note) => note.bookId === firstBookId));
  check("notes use schema version one", gateway.notes.every((note) => note.schemaVersion === 1));

  try {
    await saveBookWithGateway(gateway, "   ", "user-1");
    check("blank titles fail before a database call", false);
  } catch (error) {
    check("blank titles fail before a database call", error instanceof SaveError && error.kind === "invalid_input");
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void run();
