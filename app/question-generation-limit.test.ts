import { vi } from "vitest";

import { db } from "~/firebase.server";

import { reserveQuestionGeneration } from "./question-generation-limit.server";

vi.mock("~/firebase.server", () => ({
  db: { collection: vi.fn(), runTransaction: vi.fn() },
}));

type Limit = { day: string; count: number; lastRequestedAt?: number };
const documents = new Map<string, Limit>();
let now = Date.parse("2026-10-21T12:00:00Z");
const originalLimit = process.env.GEMINI_DAILY_REQUEST_LIMIT;

beforeEach(() => {
  vi.clearAllMocks();
  documents.clear();
  now = Date.parse("2026-10-21T12:00:00Z");
  vi.spyOn(Date, "now").mockImplementation(() => now);
  delete process.env.GEMINI_DAILY_REQUEST_LIMIT;
  vi.mocked(db.collection).mockReturnValue({
    doc: (id: string) => ({ id }),
  } as unknown as ReturnType<typeof db.collection>);
  vi.mocked(db.runTransaction).mockImplementation(async (callback) => {
    const writes = new Map<string, Limit>();
    const transaction = {
      get: async (ref: { id: string }) => ({
        data: () => documents.get(ref.id),
      }),
      set: (ref: { id: string }, value: Limit) => writes.set(ref.id, value),
    };
    const result = await callback(
      transaction as unknown as Parameters<
        Parameters<typeof db.runTransaction>[0]
      >[0]
    );
    writes.forEach((value, id) => documents.set(id, value));
    return result;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalLimit === undefined)
    delete process.env.GEMINI_DAILY_REQUEST_LIMIT;
  else process.env.GEMINI_DAILY_REQUEST_LIMIT = originalLimit;
});

test("reserves a shared and a per-user budget without storing the raw user ID", async () => {
  await reserveQuestionGeneration("person@example.com");
  expect(documents.size).toBe(2);
  expect(documents.get("global")).toEqual({ day: "2026-10-21", count: 1 });
  expect([...documents.keys()].some((key) => key.includes("person"))).toBe(
    false
  );
  expect(
    [...documents.values()].some((value) => value.lastRequestedAt === now)
  ).toBe(true);
});

test("enforces a cooldown without charging a denied request", async () => {
  await reserveQuestionGeneration("user-1");
  now += 15000;
  await expect(reserveQuestionGeneration("user-1")).rejects.toMatchObject({
    status: 429,
    retryAfter: 45,
  });
  expect(documents.get("global")?.count).toBe(1);
  now += 45000;
  await reserveQuestionGeneration("user-1");
  expect(documents.get("global")?.count).toBe(2);
});

test("enforces five daily requests per user and resets at UTC midnight", async () => {
  for (let i = 0; i < 5; i++) {
    await reserveQuestionGeneration("user-1");
    now += 60000;
  }
  await expect(reserveQuestionGeneration("user-1")).rejects.toMatchObject({
    status: 429,
  });
  now = Date.parse("2026-10-22T00:00:01Z");
  await reserveQuestionGeneration("user-1");
  expect(documents.get("global")).toEqual({ day: "2026-10-22", count: 1 });
});

test("enforces the app-wide cap across different users", async () => {
  process.env.GEMINI_DAILY_REQUEST_LIMIT = "2";
  await reserveQuestionGeneration("user-1");
  await reserveQuestionGeneration("user-2");
  await expect(reserveQuestionGeneration("user-3")).rejects.toMatchObject({
    status: 429,
    retryAfter: 43200,
  });
  expect(documents.get("global")?.count).toBe(2);
});

test.each(["0", "-1", "1.5", "1001", "invalid", ""])(
  "rejects invalid budget configuration %s",
  async (limit) => {
    process.env.GEMINI_DAILY_REQUEST_LIMIT = limit;
    await expect(reserveQuestionGeneration("user-1")).rejects.toMatchObject({
      status: 503,
    });
    expect(db.runTransaction).not.toHaveBeenCalled();
  }
);

test("does not silently ignore a failed shared quota reservation", async () => {
  vi.mocked(db.runTransaction).mockRejectedValueOnce(new Error("unavailable"));
  await expect(reserveQuestionGeneration("user-1")).rejects.toThrow(
    "unavailable"
  );
});
