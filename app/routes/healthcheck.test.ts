import { vi } from "vitest";

import { db } from "~/firebase.server";

import { loader } from "./healthcheck";

vi.mock("~/firebase.server", () => ({
  db: {
    collection: vi.fn(() => ({
      limit: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({}),
      })),
    })),
  },
}));

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(null, { status: 200 })
    ) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.clearAllMocks();
});

test("checks Firestore before reporting the app healthy", async () => {
  const request = new Request("http://app.test/healthcheck", {
    headers: { host: "app.test" },
  });

  const response = (await loader({
    request,
    params: {},
    context: {},
  })) as Response;

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("OK");
  expect(db.collection).toHaveBeenCalledWith("questions");
  expect(globalThis.fetch).toHaveBeenCalledWith("http://app.test/", {
    method: "HEAD",
  });
});
