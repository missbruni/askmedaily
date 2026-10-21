import { vi } from "vitest";

import { createQuestions, getQuestionsByUser } from "~/question.server";
import { generateQuestionSuggestions } from "~/question-generation.server";
import { QuestionGenerationError } from "~/question-generation-limit.server";
import { getUserSession } from "~/session.server";

import { action, loader } from "./generate";

vi.mock("~/firebase.server", () => ({ db: {} }));
vi.mock("~/question.server", () => ({
  createQuestions: vi.fn(),
  getQuestionsByUser: vi.fn(),
}));
vi.mock("~/question-generation.server", () => ({
  generateQuestionSuggestions: vi.fn(),
}));
vi.mock("~/session.server", () => ({ getUserSession: vi.fn() }));

const user = { uid: "user-123" } as NonNullable<
  Awaited<ReturnType<typeof getUserSession>>
>;
const originalKey = process.env.GEMINI_API_KEY;
const suggestion = "What makes you smile?";

async function submit(form: URLSearchParams, origin = "http://app.test") {
  return (await action({
    request: new Request("http://app.test/questions/generate", {
      method: "POST",
      headers: { Origin: origin },
      body: form,
    }),
    params: {},
    context: {},
  })) as Response;
}

function generation(topic = "", count = "10") {
  return new URLSearchParams({ intent: "generate", topic, count });
}

function selection(questions: string[], selected = questions.map((_, i) => i)) {
  const form = new URLSearchParams({ intent: "save" });
  questions.forEach((question) => form.append("question", question));
  selected.forEach((index) => form.append("selected", String(index)));
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GEMINI_API_KEY = "test-only-key";
  vi.mocked(getUserSession).mockResolvedValue(user);
  vi.mocked(getQuestionsByUser).mockResolvedValue([]);
  vi.mocked(createQuestions).mockResolvedValue([]);
  vi.mocked(generateQuestionSuggestions).mockResolvedValue([suggestion]);
});

afterEach(() => {
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
});

test("requires authentication before generating, saving, or viewing the page", async () => {
  vi.mocked(getUserSession).mockResolvedValue(null);
  const first = await submit(generation());
  const save = await submit(selection([suggestion]));
  const page = (await loader({
    request: new Request("http://app.test/questions/generate"),
    params: {},
    context: {},
  })) as Response;
  expect([first.status, save.status, page.status]).toEqual([302, 302, 302]);
  expect(first.headers.get("Location")).toBe("/");
  expect(generateQuestionSuggestions).not.toHaveBeenCalled();
  expect(createQuestions).not.toHaveBeenCalled();
  expect(getQuestionsByUser).not.toHaveBeenCalled();
});

test("only exposes whether Gemini is configured, never the server key", async () => {
  const request = new Request("http://app.test/questions/generate");
  const configured = (await loader({
    request,
    params: {},
    context: {},
  })) as Response;
  expect(await configured.json()).toEqual({ enabled: true });
  delete process.env.GEMINI_API_KEY;
  const disabled = (await loader({
    request,
    params: {},
    context: {},
  })) as Response;
  expect(await disabled.json()).toEqual({ enabled: false });
});

test("generates an editable preview without saving any question documents", async () => {
  const response = await submit(generation("  teamwork  ", "5"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    drafts: [{ question: suggestion, selected: true }],
    filteredCount: 0,
  });
  expect(generateQuestionSuggestions).toHaveBeenCalledWith({
    userId: user.uid,
    topic: "teamwork",
    count: 5,
  });
  expect(createQuestions).not.toHaveBeenCalled();
});

test("leaves existing questions out of the preview", async () => {
  vi.mocked(getQuestionsByUser).mockResolvedValue([
    { question: "  WHAT   MAKES YOU SMILE? " },
  ] as Awaited<ReturnType<typeof getQuestionsByUser>>);
  vi.mocked(generateQuestionSuggestions).mockResolvedValue([
    suggestion,
    "What would you like to learn?",
  ]);
  const response = await submit(generation());
  expect(await response.json()).toEqual({
    drafts: [{ question: "What would you like to learn?", selected: true }],
    filteredCount: 1,
  });
});

test("asks for a different topic when every suggestion is already present", async () => {
  vi.mocked(getQuestionsByUser).mockResolvedValue([
    { question: suggestion },
  ] as Awaited<ReturnType<typeof getQuestionsByUser>>);
  expect((await submit(generation())).status).toBe(422);
  expect(createQuestions).not.toHaveBeenCalled();
});

test("adds only selected, edited questions under the authenticated owner", async () => {
  const response = await submit(
    selection(["  Edited question?  ", "", "Keep this one?"], [0, 2])
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ savedCount: 2 });
  expect(createQuestions).toHaveBeenCalledWith(
    ["Edited question?", "Keep this one?"],
    user.uid
  );
  expect(generateQuestionSuggestions).not.toHaveBeenCalled();
});

test("revalidates edits and rejects duplicates before any write", async () => {
  const empty = await submit(selection([""]));
  const repeated = await submit(
    selection([suggestion, suggestion.toUpperCase()])
  );
  const long = await submit(selection(["a".repeat(301)]));
  const nothing = await submit(selection([suggestion], []));
  const badIndex = await submit(selection([suggestion], [20]));
  expect([
    empty.status,
    repeated.status,
    long.status,
    nothing.status,
    badIndex.status,
  ]).toEqual([400, 400, 400, 400, 400]);
  expect(createQuestions).not.toHaveBeenCalled();
});

test("rechecks current collection on save and retains the editable preview on failure", async () => {
  vi.mocked(getQuestionsByUser).mockResolvedValue([
    { question: suggestion.toUpperCase() },
  ] as Awaited<ReturnType<typeof getQuestionsByUser>>);
  const response = await submit(selection([suggestion]));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    drafts: [{ question: suggestion, selected: true }],
  });
  expect(createQuestions).not.toHaveBeenCalled();
});

test("preserves the review when saving fails and does not claim success", async () => {
  vi.mocked(createQuestions).mockRejectedValueOnce(
    new Error("Database unavailable")
  );
  const response = await submit(selection([suggestion]));
  expect(response.status).toBe(500);
  expect(await response.json()).toMatchObject({
    drafts: [{ question: suggestion, selected: true }],
    error: expect.any(String),
  });
});

test("returns retry guidance for provider and application limits", async () => {
  vi.mocked(generateQuestionSuggestions).mockRejectedValueOnce(
    new QuestionGenerationError("Please wait a minute.", 429, 45)
  );
  const response = await submit(generation());
  expect(response.status).toBe(429);
  expect(response.headers.get("Retry-After")).toBe("45");
  expect(await response.json()).toEqual({ error: "Please wait a minute." });
  expect(createQuestions).not.toHaveBeenCalled();
});

test("rejects invalid generation options, unknown actions, large forms, and cross-origin requests", async () => {
  const results = await Promise.all([
    submit(generation("", "500")),
    submit(generation("a".repeat(201))),
    submit(new URLSearchParams({ intent: "unknown" })),
    submit(generation("a".repeat(66 * 1024))),
    submit(generation(), "https://other.test"),
  ]);
  expect(results.map((response) => response.status)).toEqual([
    400, 400, 400, 413, 403,
  ]);
  expect(generateQuestionSuggestions).not.toHaveBeenCalled();
  expect(createQuestions).not.toHaveBeenCalled();
});
