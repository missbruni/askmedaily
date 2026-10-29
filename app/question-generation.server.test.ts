import { vi } from "vitest";

import {
  QuestionGenerationError,
  reserveQuestionGeneration,
} from "./question-generation-limit.server";
import { generateQuestionSuggestions } from "./question-generation.server";
import { postJson } from "./post-json.server";

import type * as GenerationLimits from "./question-generation-limit.server";

vi.mock("~/firebase.server", () => ({ db: {} }));
vi.mock("~/post-json.server", () => ({ postJson: vi.fn() }));
vi.mock("~/question-generation-limit.server", async () => ({
  ...(await vi.importActual<typeof GenerationLimits>(
    "./question-generation-limit.server"
  )),
  reserveQuestionGeneration: vi.fn(),
}));

const environment = {
  key: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL,
};
const options = { userId: "user-1", topic: "teamwork", count: 5 };
const requestMock = vi.mocked(postJson);

function completed(questions: unknown[]) {
  return {
    status: 200,
    body: JSON.stringify({
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: JSON.stringify({ questions }) }] },
        },
      ],
    }),
  };
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-only-key";
  delete process.env.GEMINI_MODEL;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new Error("Unexpected global fetch in a Gemini generation test.")
  );
  vi.mocked(reserveQuestionGeneration).mockReset().mockResolvedValue(undefined);
  requestMock
    .mockReset()
    .mockResolvedValue(
      completed([
        "What makes you smile?",
        "What skill would you like to learn?",
      ])
    );
});

afterEach(() => {
  vi.restoreAllMocks();
  if (environment.key === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = environment.key;
  if (environment.model === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = environment.model;
});

test("requests structured suggestions with a server-side key and no user identity", async () => {
  expect(await generateQuestionSuggestions(options)).toHaveLength(2);
  expect(reserveQuestionGeneration).toHaveBeenCalledWith("user-1");
  const [url, init] = requestMock.mock.calls[0];
  expect(url).toBe(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"
  );
  expect(String(url)).not.toContain("test-only-key");
  expect(init?.headers).toMatchObject({ "x-goog-api-key": "test-only-key" });
  const body = JSON.parse(String(init?.body));
  expect(body.generationConfig.responseMimeType).toBe("application/json");
  expect(body.generationConfig).not.toHaveProperty("temperature");
  expect(body.contents[0].parts[0].text).toContain("teamwork");
  expect(init?.body).not.toContain("user-1");
  expect(init?.signal).toBeInstanceOf(AbortSignal);
});

test("supports a configured model without allowing arbitrary endpoint URLs", async () => {
  process.env.GEMINI_MODEL = "gemini-custom-flash";
  await generateQuestionSuggestions(options);
  expect(requestMock.mock.calls[0][0]).toContain(
    "/models/gemini-custom-flash:"
  );
  process.env.GEMINI_MODEL = "https://other.test/";
  await expect(generateQuestionSuggestions(options)).rejects.toMatchObject({
    status: 503,
  });
  expect(requestMock).toHaveBeenCalledTimes(1);
});

test("deduplicates suggestions and strips model thinking parts", async () => {
  requestMock.mockResolvedValue({
    status: 200,
    body: JSON.stringify({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              { thought: true, text: "Private reasoning" },
              {
                text: JSON.stringify({
                  questions: [
                    "What makes you smile?",
                    " WHAT  MAKES YOU SMILE? ",
                  ],
                }),
              },
            ],
          },
        },
      ],
    }),
  });
  expect(await generateQuestionSuggestions(options)).toEqual([
    "What makes you smile?",
  ]);
});

test("does not contact Gemini when configuration or inputs are invalid", async () => {
  delete process.env.GEMINI_API_KEY;
  await expect(generateQuestionSuggestions(options)).rejects.toMatchObject({
    status: 503,
  });
  process.env.GEMINI_API_KEY = "   ";
  await expect(generateQuestionSuggestions(options)).rejects.toMatchObject({
    status: 503,
  });
  process.env.GEMINI_API_KEY = "test-only-key";
  await expect(
    generateQuestionSuggestions({ ...options, count: 500 })
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    generateQuestionSuggestions({ ...options, topic: "a".repeat(201) })
  ).rejects.toMatchObject({ status: 400 });
  expect(reserveQuestionGeneration).not.toHaveBeenCalled();
  expect(requestMock).not.toHaveBeenCalled();
});

test("never contacts Gemini after a denied shared quota reservation", async () => {
  vi.mocked(reserveQuestionGeneration).mockRejectedValue(
    new QuestionGenerationError("Rate limited", 429, 60)
  );
  await expect(generateQuestionSuggestions(options)).rejects.toMatchObject({
    status: 429,
    retryAfter: 60,
  });
  expect(requestMock).not.toHaveBeenCalled();
});

test.each([400, 401, 403, 404, 429, 500])(
  "handles provider status %i without leaking its response",
  async (status) => {
    requestMock.mockResolvedValue({
      status,
      body: "Sensitive provider details",
    });
    await expect(generateQuestionSuggestions(options)).rejects.toMatchObject({
      status: status === 429 ? 429 : status === 500 ? 502 : 503,
    });
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      "Gemini generation request failed.",
      { model: "gemini-3.5-flash-lite", status }
    );
  }
);

test.each([
  {},
  { candidates: [{ finishReason: "SAFETY" }] },
  { candidates: [{ finishReason: "MAX_TOKENS" }] },
])("does not accept blocked or incomplete output", async (output) => {
  requestMock.mockResolvedValue({
    status: 200,
    body: JSON.stringify(output),
  });
  await expect(generateQuestionSuggestions(options)).rejects.toMatchObject({
    status: 422,
  });
});

test.each(
  [
    [""],
    ["a".repeat(301)],
    [null],
    [],
    Array.from({ length: 6 }, (_, i) => `Question ${i}?`),
  ].map((questions) => [questions])
)("rejects invalid structured question content", async (questions) => {
  requestMock.mockResolvedValue(completed(questions));
  await expect(generateQuestionSuggestions(options)).rejects.toMatchObject({
    status: 502,
  });
});

test("handles malformed JSON and network failures without automatic retries", async () => {
  requestMock.mockResolvedValueOnce({ status: 200, body: "not-json" });
  await expect(generateQuestionSuggestions(options)).rejects.toMatchObject({
    status: 502,
  });
  requestMock.mockRejectedValueOnce(new Error("network failure"));
  await expect(generateQuestionSuggestions(options)).rejects.toMatchObject({
    status: 502,
  });
  expect(requestMock).toHaveBeenCalledTimes(2);
});

test("aborts slow generation and reports a timeout", async () => {
  const timers = vi.spyOn(globalThis, "setTimeout");
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  requestMock.mockImplementation(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        started();
        init?.signal?.addEventListener("abort", () =>
          reject(new Error("aborted"))
        );
      })
  );
  const pending = generateQuestionSuggestions(options);
  await ready;
  const timeout = timers.mock.calls.find(([, delay]) => delay === 20000);
  expect(timeout).toBeDefined();
  (timeout![0] as () => void)();
  await expect(pending).rejects.toMatchObject({ status: 504 });
  expect(console.warn).toHaveBeenCalledWith("Gemini generation timed out.", {
    model: "gemini-3.5-flash-lite",
  });
});
