import { vi } from "vitest";

import { createQuestions } from "~/question.server";
import { MAX_QUESTION_IMPORT_BYTES } from "~/question-import.server";
import { getUserSession } from "~/session.server";

import { action } from "./import";

vi.mock("~/question.server", () => ({
  createQuestions: vi.fn(),
}));

vi.mock("~/session.server", () => ({
  getUserSession: vi.fn(),
}));

const user = { uid: "user-123" } as NonNullable<
  Awaited<ReturnType<typeof getUserSession>>
>;

beforeEach(() => {
  vi.mocked(getUserSession).mockResolvedValue(user);
  vi.mocked(createQuestions).mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

test("imports validated questions for the signed-in user", async () => {
  const formData = new FormData();
  formData.set("intent", "import");
  formData.set(
    "csvContent",
    "question\nWhat makes you laugh?\nWhat inspires you?"
  );

  const response = (await action({
    request: new Request("http://app.test/questions/import", {
      method: "POST",
      body: formData,
    }),
    params: {},
    context: {},
  })) as Response;

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ importedCount: 2 });
  expect(createQuestions).toHaveBeenCalledWith(
    ["What makes you laugh?", "What inspires you?"],
    "user-123"
  );
});

test("previews an uploaded CSV without importing its questions", async () => {
  const boundary = "askmedaily-test";
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="intent"',
    "",
    "preview",
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="questions.csv"',
    "Content-Type: text/csv",
    "",
    "question\nWhat makes you laugh?",
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const response = (await action({
    request: new Request("http://app.test/questions/import", {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body,
    }),
    params: {},
    context: {},
  })) as Response;

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    preview: { questions: ["What makes you laugh?"] },
  });
  expect(createQuestions).not.toHaveBeenCalled();
});

test("rejects an oversized multipart file before reading it into memory", async () => {
  const boundary = "askmedaily-oversized-test";
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="intent"',
    "",
    "preview",
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="questions.csv"',
    "Content-Type: text/csv",
    "",
    "x".repeat(MAX_QUESTION_IMPORT_BYTES + 1),
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const response = (await action({
    request: new Request("http://app.test/questions/import", {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body,
    }),
    params: {},
    context: {},
  })) as Response;

  expect(response.status).toBe(413);
  expect(createQuestions).not.toHaveBeenCalled();
});

test("does not import rows with validation errors", async () => {
  const formData = new FormData();
  formData.set("intent", "import");
  formData.set(
    "csvContent",
    "question\nWhat makes you laugh?\nwhat makes you laugh?"
  );

  const response = (await action({
    request: new Request("http://app.test/questions/import", {
      method: "POST",
      body: formData,
    }),
    params: {},
    context: {},
  })) as Response;

  expect(response.status).toBe(400);
  expect(createQuestions).not.toHaveBeenCalled();
});
