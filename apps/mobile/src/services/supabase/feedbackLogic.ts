import type { InBookRef, RealWorldRef, VocabItem } from "../../types";

export type FeedbackAnnotationType = "vocab" | "inBookRef" | "realWorldRef";

export type FeedbackAnnotation =
  | { type: "vocab"; item: VocabItem }
  | { type: "inBookRef"; item: InBookRef }
  | { type: "realWorldRef"; item: RealWorldRef };

export function getFeedbackAnnotationId(annotation: FeedbackAnnotation): string {
  const label = annotation.type === "vocab" ? annotation.item.term : annotation.item.label;
  return `${annotation.type}:${annotation.item.start}:${annotation.item.end}:${label}`;
}

export function getFeedbackSuccessMessage(annotationType: FeedbackAnnotationType): string {
  switch (annotationType) {
    case "vocab":
      return "Vocabulary feedback saved.";
    case "inBookRef":
      return "In-book feedback saved.";
    case "realWorldRef":
      return "Real-world feedback saved.";
  }
}
