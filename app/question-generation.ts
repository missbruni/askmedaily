export const GENERATION_COUNTS = [5, 10, 20];
export const MAX_GENERATED_QUESTION_LENGTH = 300;
export const MAX_GENERATION_TOPIC_LENGTH = 200;

export type QuestionDraft = { question: string; selected: boolean };

export function normalizeQuestion(question: string) {
  return question.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function validateQuestionDrafts(values: unknown[]) {
  const questions: string[] = [];
  const seen = new Set<string>();
  if (values.length === 0 || values.length > 20) {
    return { questions, error: "Select between 1 and 20 questions to add." };
  }
  for (const [index, value] of values.entries()) {
    if (typeof value !== "string" || !value.trim()) {
      return { questions: [], error: `Question ${index + 1} cannot be empty.` };
    }
    const question = value.trim().replace(/\s+/g, " ");
    if (question.length > MAX_GENERATED_QUESTION_LENGTH) {
      return {
        questions: [],
        error: `Question ${
          index + 1
        } must be ${MAX_GENERATED_QUESTION_LENGTH} characters or fewer.`,
      };
    }
    const normalized = normalizeQuestion(question);
    if (seen.has(normalized)) {
      return { questions: [], error: "Edit or deselect duplicate questions." };
    }
    seen.add(normalized);
    questions.push(question);
  }
  return { questions, error: undefined };
}
