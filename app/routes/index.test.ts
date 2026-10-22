import { createRequestHandler } from "@remix-run/server-runtime";
import { vi } from "vitest";

import { getQuestionIds, getQuestionsByIds } from "~/question.server";
import { getUserSession } from "~/session.server";

import { loader } from "./index";
import { action } from "./question-progress";

vi.mock("~/question.server", () => ({
  getQuestionIds: vi.fn(),
  getQuestionsByIds: vi.fn(),
}));
vi.mock("~/session.server", () => ({ getUserSession: vi.fn() }));

const ids = Array.from({ length: 12 }, (_, i) => `q-${i}`);
let cookie = "";

async function load() {
  const response = await loader({
    request: new Request("http://app.test/", {
      headers: { Cookie: cookie },
    }),
    params: {},
    context: {},
  });
  cookie = response.headers.get("Set-Cookie")!.split(";")[0];
  return { response, data: await response.json() };
}

async function swipe(
  round: string,
  questionId: string,
  origin = "http://app.test",
  headers: Record<string, string> = {}
) {
  const response = (await action({
    request: new Request("http://app.test/question-progress", {
      method: "POST",
      headers: { Cookie: cookie, Origin: origin, ...headers },
      body: new URLSearchParams({ round, questionId }),
    }),
    params: {},
    context: {},
  })) as Response;
  const nextCookie = response.headers.get("Set-Cookie");
  if (nextCookie) cookie = nextCookie.split(";")[0];
  return response;
}

beforeEach(() => {
  vi.clearAllMocks();
  cookie = "";
  vi.mocked(getUserSession).mockResolvedValue(null);
  vi.mocked(getQuestionIds).mockResolvedValue(ids);
  vi.mocked(getQuestionsByIds).mockImplementation(async (selected) =>
    selected.map((id) => ({
      id,
      question: `Question ${id}`,
      userId: "author",
      modified: "",
      created: "",
    }))
  );
});

test("anonymous visitors resume per swipe across reloads and complete a round without repeats", async () => {
  const first = await load();
  expect(first.response.headers.get("Cache-Control")).toBe("no-store");
  expect(first.response.headers.get("Set-Cookie")).toContain("HttpOnly");
  const firstId = first.data.questions[0].id;
  const readsBeforeSwipe = vi.mocked(getQuestionIds).mock.calls.length;
  const fetchesBeforeSwipe = vi.mocked(getQuestionsByIds).mock.calls.length;
  expect((await swipe(first.data.round, firstId)).status).toBe(204);
  expect(getQuestionIds).toHaveBeenCalledTimes(readsBeforeSwipe);
  expect(getQuestionsByIds).toHaveBeenCalledTimes(fetchesBeforeSwipe);

  let page = (await load()).data;
  expect(page.questions[0].id).toBe(first.data.questions[1].id);
  const seen = [firstId];
  while (seen.length < ids.length) {
    expect(page.round).toBe(first.data.round);
    for (const question of page.questions) {
      expect(seen).not.toContain(question.id);
      seen.push(question.id);
      await swipe(page.round, question.id);
    }
    page = (await load()).data;
  }
  expect(new Set(seen).size).toBe(ids.length);
  expect(page.round).not.toBe(first.data.round);
  expect(page.questions[0].id).not.toBe(seen[seen.length - 1]);
});

test("an unconsumed batch is not skipped by a refresh", async () => {
  expect((await load()).data.questions).toEqual((await load()).data.questions);
});

test("saves swipe progress through Fly's HTTPS-terminating proxy", async () => {
  const first = (await load()).data;
  const headers = { "X-Forwarded-Proto": "https" };
  const saved = await swipe(
    first.round,
    first.questions[0].id,
    "https://app.test",
    headers
  );
  expect(saved.status).toBe(204);
  expect(saved.headers.get("Set-Cookie")).toContain("__question_deck=");
  expect((await load()).data.questions[0].id).toBe(first.questions[1].id);
});

test("rejects cross-site proxy swipes without advancing progress", async () => {
  const first = (await load()).data;
  const previousCookie = cookie;
  const denied = await swipe(
    first.round,
    first.questions[0].id,
    "https://other.test",
    { "X-Forwarded-Proto": "https", "X-Forwarded-Host": "other.test" }
  );
  expect(denied.status).toBe(403);
  expect(denied.headers.get("Set-Cookie")).toBeNull();
  expect(cookie).toBe(previousCookie);
});

test("keeps the same bookmark when the visitor signs in", async () => {
  const first = (await load()).data;
  await swipe(first.round, first.questions[0].id);
  vi.mocked(getUserSession).mockResolvedValue({
    email: "person@example.com",
  } as NonNullable<Awaited<ReturnType<typeof getUserSession>>>);
  const next = (await load()).data;
  expect(next.user).toBe("person@example.com");
  expect(next.round).toBe(first.round);
  expect(next.questions[0].id).toBe(first.questions[1].id);
  expect(cookie).toMatch(/^__question_deck=/);
});

test("recovers from a corrupt or tampered cookie", async () => {
  cookie = "__question_deck=invalid";
  expect((await load()).data.questions).toHaveLength(5);
});

test("rejects missing progress, malformed input, cross-origin writes and expired rounds", async () => {
  expect((await swipe("a".repeat(32), ids[0])).status).toBe(409);
  const { round, questions } = (await load()).data;
  expect((await swipe(round, "")).status).toBe(400);
  expect(
    (await swipe(round, questions[0].id, "https://other.test")).status
  ).toBe(403);
  expect((await swipe("not-a-seed", ids[0])).status).toBe(400);
  expect((await swipe("b".repeat(32), ids[0])).status).toBe(409);
});

test("skips deleted batches still present in the ID cache", async () => {
  vi.mocked(getQuestionsByIds).mockResolvedValueOnce([]);
  const { questions } = (await load()).data;
  expect(questions).toHaveLength(5);
  expect(getQuestionsByIds).toHaveBeenCalledTimes(2);
  const batches = vi.mocked(getQuestionsByIds).mock.calls;
  expect(batches[1][0].some((id) => batches[0][0].includes(id))).toBe(false);
});

test("handles a completely deleted or empty question pool", async () => {
  vi.mocked(getQuestionsByIds).mockResolvedValue([]);
  expect((await load()).data.questions).toEqual([]);
  vi.mocked(getQuestionIds).mockResolvedValue([]);
  expect((await load()).data.questions).toEqual([]);
});

test("fills a partially deleted batch without consuming any live questions", async () => {
  const first = (await load()).data;
  const removed = first.questions[1].id;
  vi.mocked(getQuestionsByIds).mockImplementation(async (selected) =>
    selected
      .filter((id) => id !== removed)
      .map((id) => ({
        id,
        question: `Question ${id}`,
        userId: "author",
        modified: "",
        created: "",
      }))
  );
  const next = (await load()).data;
  expect(next.questions).toHaveLength(5);
  expect(next.questions[0].id).toBe(first.questions[0].id);
  expect(
    next.questions.map((question: { id: string }) => question.id)
  ).not.toContain(removed);
  expect(next.round).toBe(first.round);
});

test("the resource endpoint saves through Remix routing without running page loaders", async () => {
  const handle = createRequestHandler(
    {
      routes: {
        root: { id: "root", path: "", module: {} },
        "routes/index": {
          id: "routes/index",
          parentId: "root",
          index: true,
          module: { loader, default: () => null },
        },
        "routes/question-progress": {
          id: "routes/question-progress",
          parentId: "root",
          path: "question-progress",
          module: { action },
        },
      },
      entry: { module: {} },
      assets: { routes: {} },
      future: {},
    } as unknown as Parameters<typeof createRequestHandler>[0],
    "test"
  );
  const first = await handle(
    new Request("http://app.test/?_data=routes%2Findex")
  );
  const data = await first.json();
  const questionReads = vi.mocked(getQuestionsByIds).mock.calls.length;
  const saved = await handle(
    new Request("http://app.test/question-progress", {
      method: "POST",
      headers: { Cookie: first.headers.get("Set-Cookie")!.split(";")[0] },
      body: new URLSearchParams({
        round: data.round,
        questionId: data.questions[0].id,
      }),
    })
  );
  expect(saved.status).toBe(204);
  expect(getQuestionsByIds).toHaveBeenCalledTimes(questionReads);
  expect(
    saved.headers.get("Set-Cookie")!.match(/__question_deck=/g)
  ).toHaveLength(1);
  const next = await handle(
    new Request("http://app.test/?_data=routes%2Findex", {
      headers: { Cookie: saved.headers.get("Set-Cookie")!.split(";")[0] },
    })
  );
  expect((await next.json()).questions[0].id).toBe(data.questions[1].id);
});
