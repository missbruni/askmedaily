import {
  normalizeQuestion,
  validateQuestionDrafts,
} from "./question-generation";

test("normalizes case, whitespace, and Unicode for duplicate comparison", () => {
  expect(normalizeQuestion("  WHAT   makes you smile? ")).toBe(
    normalizeQuestion("\uff37hat makes you smile?")
  );
});

test("preserves wording while cleaning whitespace in accepted questions", () => {
  expect(validateQuestionDrafts(["  What   makes you smile?  "])).toEqual({
    questions: ["What makes you smile?"],
    error: undefined,
  });
});

test.each(
  [
    [],
    Array.from({ length: 21 }, (_, i) => `Question ${i}?`),
    [""],
    ["   "],
    [null],
    ["a".repeat(301)],
    ["What makes you smile?", " WHAT  MAKES YOU SMILE? "],
  ].map((values) => [values])
)("rejects an invalid selected question list", (values) => {
  expect(validateQuestionDrafts(values).error).toBeTruthy();
  expect(validateQuestionDrafts(values).questions).toEqual([]);
});
