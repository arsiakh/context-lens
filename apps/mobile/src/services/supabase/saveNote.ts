import { supabase } from "./client";
import {
  SaveError,
  saveBookWithGateway,
  saveNoteWithGateway,
  type InsertNoteInput,
  type SaveGateway,
  type SaveNoteInput,
  type SaveResult,
} from "./saveNoteLogic";

const supabaseSaveGateway: SaveGateway = {
  async upsertBook(title, userId) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || sessionData.session?.user.id !== userId) {
      throw new SaveError("unauthenticated", "Your session expired. Sign in again before saving.");
    }

    const { data, error } = await supabase.rpc("upsert_book", { p_title: title });
    if (error) {
      console.warn("[Save] book upsert failed", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new SaveError("book", error.message || "The book could not be saved. Please try again.");
    }
    if (typeof data !== "string" || !data) {
      throw new SaveError("book", "The book could not be saved. Please try again.");
    }
    return data;
  },

  async insertNote(input: InsertNoteInput) {
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: input.userId,
        book_id: input.bookId,
        passage_text: input.passageText,
        annotations: input.annotations,
        schema_version: input.schemaVersion,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[Save] note insert failed", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new SaveError("note", error.message || "The passage could not be saved. Please try again.");
    }
    if (!data?.id || typeof data.id !== "string") {
      throw new SaveError("note", "The passage could not be saved. Please try again.");
    }
    return data.id;
  },
};

export function saveBook(title: string, userId: string): Promise<string> {
  return saveBookWithGateway(supabaseSaveGateway, title, userId);
}

export function saveNote(input: SaveNoteInput): Promise<SaveResult> {
  return saveNoteWithGateway(supabaseSaveGateway, input);
}

export { SaveError } from "./saveNoteLogic";
export type { SaveNoteInput, SaveResult } from "./saveNoteLogic";
