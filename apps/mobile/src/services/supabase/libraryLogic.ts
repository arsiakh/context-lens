import type { AnalyzeResponse, Book, Note } from "../../types";

export const NOTE_PREVIEW_CHARS = 60;

export interface BookRow {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface NoteRow {
  id: string;
  user_id: string;
  book_id: string;
  passage_text: string;
  annotations: AnalyzeResponse;
  schema_version: number;
  created_at: string;
}

export function toBook(row: BookRow): Book {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    createdAt: row.created_at,
  };
}

export function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    passageText: row.passage_text,
    annotations: row.annotations,
    schemaVersion: row.schema_version,
    createdAt: row.created_at,
  };
}

export function sortBooksByTitle<T extends { title: string }>(books: T[]): T[] {
  return [...books].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
}

export function getNotePreview(passageText: string, maxChars = NOTE_PREVIEW_CHARS): string {
  const cleaned = passageText.trim().replace(/\s+/g, " ");
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars).trimEnd()}…`;
}
