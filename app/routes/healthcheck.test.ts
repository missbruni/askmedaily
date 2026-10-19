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

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

test("checks Firestore before reporting the app healthy", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
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
  expect(fetchSpy).not.toHaveBeenCalled();
});
