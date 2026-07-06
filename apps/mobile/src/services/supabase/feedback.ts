import { supabase } from "./client";
import {
  getFeedbackAnnotationId,
  type FeedbackAnnotation,
  type FeedbackAnnotationType,
} from "./feedbackLogic";

export class FeedbackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedbackError";
  }
}

export interface SubmitAnnotationFeedbackInput {
  userId: string;
  annotation: FeedbackAnnotation;
}

export async function submitAnnotationFeedback(input: SubmitAnnotationFeedbackInput): Promise<void> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || sessionData.session?.user.id !== input.userId) {
    throw new FeedbackError("Sign in again before sending feedback.");
  }

  const annotationType: FeedbackAnnotationType = input.annotation.type;
  const { error } = await supabase.from("annotation_feedback").insert({
    user_id: input.userId,
    annotation_id: getFeedbackAnnotationId(input.annotation),
    annotation_type: annotationType,
  });

  if (error) {
    console.warn("[Feedback] insert failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new FeedbackError("Feedback could not be saved. Please try again.");
  }
}
