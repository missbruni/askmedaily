import { screen, waitFor } from "@testing-library/dom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { vi } from "vitest";

import { useQuestionProgress } from "./use-question-progress";

import type { Root } from "react-dom/client";

let progress: ReturnType<typeof useQuestionProgress>;
let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

function mountHarness() {
  const mount = () => root.render(<Harness />);
  act(mount);
}

function Harness() {
  progress = useQuestionProgress("a".repeat(32));
  return progress.saveFailed ? (
    <button onClick={progress.retry}>Retry</button>
  ) : null;
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

test("serializes rapid swipes so progress cookies cannot arrive out of order", async () => {
  let resolveFirst!: (response: Response) => void;
  const firstRequest = new Promise<Response>((resolve) => {
    resolveFirst = resolve;
  });
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockReturnValueOnce(firstRequest)
    .mockResolvedValue(new Response(null, { status: 204 }));
  mountHarness();

  let finalSave!: Promise<void>;
  act(() => {
    void progress.save("q1");
    void progress.save("q2");
    finalSave = progress.save("q3");
  });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  await act(async () => {
    resolveFirst(new Response(null, { status: 204 }));
    await finalSave;
  });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

  expect(
    fetchMock.mock.calls.map(([, options]) =>
      (options?.body as URLSearchParams).get("questionId")
    )
  ).toEqual(["q1", "q2", "q3"]);
  expect(fetchMock.mock.calls[0][1]).toMatchObject({
    method: "POST",
    keepalive: true,
    credentials: "same-origin",
  });
  expect(fetchMock.mock.calls[0][0]).toBe("/question-progress");
});

test("waits for the final cookie before requesting the next batch", async () => {
  let resolveSave!: (response: Response) => void;
  vi.spyOn(globalThis, "fetch").mockReturnValue(
    new Promise<Response>((resolve) => {
      resolveSave = resolve;
    })
  );
  const reload = vi
    .spyOn(window.location, "reload")
    .mockImplementation(() => {});
  mountHarness();
  await act(async () => {
    void progress.save("last-card");
    progress.finish();
  });
  expect(reload).not.toHaveBeenCalled();
  await act(async () => {
    resolveSave(new Response(null, { status: 204 }));
  });
  expect(reload).toHaveBeenCalledTimes(1);
});

test("failed final saves keep the bookmark retryable instead of reloading into repeats", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(new Response(null, { status: 204 }));
  const reload = vi
    .spyOn(window.location, "reload")
    .mockImplementation(() => {});
  mountHarness();
  await act(async () => {
    void progress.save("last-card");
    progress.finish();
  });
  await screen.findByRole("button", { name: "Retry" });
  expect(reload).not.toHaveBeenCalled();
  await act(async () => {
    progress.retry();
  });
  await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(
    (fetchMock.mock.calls[1][1]?.body as URLSearchParams).get("questionId")
  ).toBe("last-card");
});

test("a later successful swipe recovers from an earlier failed save", async () => {
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValue(new Response(null, { status: 204 }));
  mountHarness();
  await act(async () => {
    void progress.save("first-card");
  });
  await screen.findByRole("button", { name: "Retry" });
  await act(async () => {
    await progress.save("second-card");
  });
  expect(progress.saveFailed).toBe(false);
});
