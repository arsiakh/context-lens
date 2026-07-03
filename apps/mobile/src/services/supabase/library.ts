import { supabase } from "./client";
import type { Book, Note } from "../../types";
import { sortBooksByTitle, toBook, toNote, type BookRow, type NoteRow } from "./libraryLogic";

export type LibraryErrorKind = "unauthenticated" | "books" | "notes";

export class LibraryError extends Error {
  constructor(public readonly kind: LibraryErrorKind, message: string) {
    super(message);
    this.name = "LibraryError";
  }
}

async function assertCurrentUser(userId: string): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error || data.session?.user.id !== userId) {
    throw new LibraryError("unauthenticated", "Your session expired. Sign in again to view your Library.");
  }
}

export async function fetchBooks(userId: string): Promise<Book[]> {
  await assertCurrentUser(userId);
  const { data, error } = await supabase
    .from("books")
    .select("id,user_id,title,created_at")
    .eq("user_id", userId);

  if (error) {
    console.warn("[Library] fetch books failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new LibraryError("books", "Saved books could not be loaded. Please try again.");
  }

  return sortBooksByTitle(((data ?? []) as BookRow[]).map(toBook));
}

export async function fetchNotesForBook(userId: string, bookId: string): Promise<Note[]> {
  await assertCurrentUser(userId);
  const { data, error } = await supabase
    .from("notes")
    .select("id,user_id,book_id,passage_text,annotations,schema_version,created_at")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[Library] fetch notes failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new LibraryError("notes", "Saved notes could not be loaded. Please try again.");
  }

  return ((data ?? []) as NoteRow[]).map(toNote);
}
