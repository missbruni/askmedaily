import {
  MAX_QUESTION_IMPORT_BYTES,
  MAX_QUESTION_IMPORT_ROWS,
  parseQuestionCsv,
} from "./question-import.server";

test("parses quoted commas and escaped quotes", () => {
  expect(
    parseQuestionCsv(
      'question\n"What is your favorite food, and why?"\n"Who said ""hello""?"'
    )
  ).toEqual({
    questions: ["What is your favorite food, and why?", 'Who said "hello"?'],
    errors: [],
  });
});

test("trims questions and reports duplicates with their row numbers", () => {
  expect(
    parseQuestionCsv(
      "Question\n What makes you laugh? \n\nwhat makes you laugh?\n"
    )
  ).toEqual({
    questions: ["What makes you laugh?"],
    errors: [
      {
        row: 4,
        message: "This question is duplicated in the CSV.",
      },
    ],
  });
});

test("requires a single question column", () => {
  expect(
    parseQuestionCsv("question,category\nHow are you?,icebreaker")
  ).toEqual({
    questions: [],
    errors: [{ row: 1, message: 'The first row must be "question".' }],
  });

  expect(parseQuestionCsv("question\nHow are you?,icebreaker")).toEqual({
    questions: [],
    errors: [{ row: 2, message: "Each row must contain one question." }],
  });
});

test("rejects more than 500 questions and oversized CSV files", () => {
  const tooManyQuestions = `question\n${Array.from(
    { length: MAX_QUESTION_IMPORT_ROWS + 1 },
    (_, index) => `Question ${index + 1}`
  ).join("\n")}`;
  expect(parseQuestionCsv(tooManyQuestions).errors).toContainEqual({
    row: MAX_QUESTION_IMPORT_ROWS + 2,
    message: `A CSV can contain at most ${MAX_QUESTION_IMPORT_ROWS} questions.`,
  });

  expect(parseQuestionCsv("x".repeat(MAX_QUESTION_IMPORT_BYTES + 1))).toEqual({
    questions: [],
    errors: [{ message: "CSV files must be 512 KB or smaller." }],
  });
});
