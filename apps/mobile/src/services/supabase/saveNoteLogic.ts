import type { AnalyzeResponse } from "../../types";

export type SaveErrorKind = "invalid_input" | "unauthenticated" | "book" | "note";

export class SaveError extends Error {
  constructor(public readonly kind: SaveErrorKind, message: string) {
    super(message);
    this.name = "SaveError";
  }
}

export interface SaveNoteInput {
  userId: string;
  bookTitle: string;
  passageText: string;
  annotations: AnalyzeResponse;
}

export interface InsertNoteInput extends SaveNoteInput {
  bookId: string;
  schemaVersion: 1;
}

export interface SaveResult {
  bookId: string;
  noteId: string;
}

export interface SaveGateway {
  upsertBook(title: string, userId: string): Promise<string>;
  insertNote(input: InsertNoteInput): Promise<string>;
}

export function normalizeBookTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ");
}

export async function saveBookWithGateway(
  gateway: SaveGateway,
  title: string,
  userId: string
): Promise<string> {
  const normalizedTitle = normalizeBookTitle(title);
  if (!normalizedTitle) throw new SaveError("invalid_input", "Add a book title before saving.");
  if (!userId) throw new SaveError("unauthenticated", "Sign in again before saving.");
  return gateway.upsertBook(normalizedTitle, userId);
}

export async function saveNoteWithGateway(
  gateway: SaveGateway,
  input: SaveNoteInput
): Promise<SaveResult> {
  if (!input.passageText.trim()) {
    throw new SaveError("invalid_input", "There is no passage to save.");
  }

  const bookId = await saveBookWithGateway(gateway, input.bookTitle, input.userId);
  const noteId = await gateway.insertNote({
    ...input,
    bookId,
    bookTitle: normalizeBookTitle(input.bookTitle),
    schemaVersion: 1,
  });
  return { bookId, noteId };
}
