export interface User {
  id: string;
  email: string | null;
}

export interface Book {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
}

export interface VocabItem {
  start: number;
  end: number;
  term: string;
  pos: string;
  definition: string;
  example: string;
}

export interface InBookRef {
  start: number;
  end: number;
  label: string;
  explanation: string;
  confidence: number;
}

export interface RealWorldRef {
  start: number;
  end: number;
  label: string;
  explanation: string;
  confidence: number;
}

export type ModelName = "gpt-4o-mini" | "gpt-4o";

export interface AnalyzeResponse {
  normalizedText: string;
  bookInference: {
    title: string | null;
    confidence: number;
  };
  vocab: VocabItem[];
  inBookRefs: InBookRef[];
  realWorldRefs: RealWorldRef[];
  meta: {
    model: ModelName;
    latencyMs: number;
    fallbackUsed: boolean;
  };
}

export interface Note {
  id: string;
  userId: string;
  bookId: string;
  passageText: string;
  annotations: AnalyzeResponse;
  schemaVersion: number;
  createdAt: string;
}
