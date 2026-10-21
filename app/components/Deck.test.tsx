import { useDrag } from "@use-gesture/react";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { vi } from "vitest";

import Deck from "./Deck";

import type { Root } from "react-dom/client";

vi.mock("@use-gesture/react", () => ({
  useDrag: vi.fn(() => () => ({})),
}));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test("only dismissed top cards advance progress, in visual order, and finish once", () => {
  const onSwipe = vi.fn();
  const onFinish = vi.fn();
  const mount = () => {
    root.render(
      <Deck
        cards={["third", "second", "first"]}
        onSwipe={onSwipe}
        onFinish={onFinish}
      />
    );
  };
  act(mount);
  const drag = vi.mocked(useDrag).mock.calls[0][0];
  const swipe = (index: number, active = false, velocity = 1) => {
    act(() => {
      drag({
        args: [index],
        active,
        movement: [300, 0],
        direction: [1, 0],
        velocity: [velocity, 0],
      } as Parameters<typeof drag>[0]);
    });
  };

  swipe(0);
  swipe(2, true);
  swipe(2, false, 0.1);
  expect(onSwipe).not.toHaveBeenCalled();
  swipe(2);
  swipe(2);
  swipe(1);
  swipe(0);
  swipe(0);

  expect(onSwipe.mock.calls).toEqual([[2], [1], [0]]);
  expect(onFinish).toHaveBeenCalledTimes(1);
});
