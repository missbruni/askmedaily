import { parse } from "csv-parse/sync";

export const MAX_QUESTION_IMPORT_ROWS = 500;
export const MAX_QUESTION_IMPORT_BYTES = 512 * 1024;

export type QuestionImportError = {
  row?: number;
  message: string;
};

export type ParsedQuestionCsv = {
  questions: string[];
  errors: QuestionImportError[];
};

export function parseQuestionCsv(content: string): ParsedQuestionCsv {
  if (
    new TextEncoder().encode(content).byteLength > MAX_QUESTION_IMPORT_BYTES
  ) {
    return {
      questions: [],
      errors: [{ message: "CSV files must be 512 KB or smaller." }],
    };
  }

  let rows: string[][];
  try {
    rows = parse(content, {
      bom: true,
      relax_column_count: true,
      skip_empty_lines: false,
    }) as string[][];
  } catch {
    return {
      questions: [],
      errors: [
        { message: "Could not parse this CSV. Check its quoting and format." },
      ],
    };
  }

  const headers = rows[0]?.map((header) => header.trim().toLowerCase());
  if (!headers || headers.length !== 1 || headers[0] !== "question") {
    return {
      questions: [],
      errors: [{ row: 1, message: 'The first row must be "question".' }],
    };
  }

  const questions: string[] = [];
  const errors: QuestionImportError[] = [];
  const seenQuestions = new Set<string>();
  let questionRows = 0;

  for (const [index, row] of rows.slice(1).entries()) {
    const rowNumber = index + 2;
    if (row.every((value) => value.trim().length === 0)) continue;

    questionRows += 1;
    if (questionRows > MAX_QUESTION_IMPORT_ROWS) {
      errors.push({
        row: rowNumber,
        message: `A CSV can contain at most ${MAX_QUESTION_IMPORT_ROWS} questions.`,
      });
      break;
    }

    if (row.length !== 1) {
      errors.push({
        row: rowNumber,
        message: "Each row must contain one question.",
      });
      continue;
    }

    const question = row[0].trim();
    const normalizedQuestion = question.toLowerCase();
    if (seenQuestions.has(normalizedQuestion)) {
      errors.push({
        row: rowNumber,
        message: "This question is duplicated in the CSV.",
      });
      continue;
    }

    seenQuestions.add(normalizedQuestion);
    questions.push(question);
  }

  if (questionRows === 0) {
    errors.push({ message: "Add at least one question to the CSV." });
  }

  return { questions, errors };
}
