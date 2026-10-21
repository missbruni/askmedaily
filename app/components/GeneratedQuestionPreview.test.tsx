import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";

import GeneratedQuestionPreview from "./GeneratedQuestionPreview";

import type { ComponentProps } from "react";

vi.mock("@remix-run/react", () => ({
  Form: (props: ComponentProps<"form">) => <form {...props} />,
}));

function preview(selected: boolean, busy = false) {
  return renderToStaticMarkup(
    <GeneratedQuestionPreview
      drafts={[
        { question: "What makes you smile?", selected },
        { question: "What would you like to learn?", selected },
      ]}
      onChange={() => {}}
      busy={busy}
    />
  );
}

test("renders editable questions, inclusion controls, and an explicit save action", () => {
  const view = preview(true);
  expect(view.match(/type="checkbox"/g)).toHaveLength(2);
  expect(view.match(/<textarea/g)).toHaveLength(2);
  expect(view).toContain("What makes you smile?");
  expect(view).toContain("Add selected (2)");
  expect(view).toContain('name="question"');
  expect(view).toContain('name="selected"');
  expect(view).not.toContain("disabled");
});

test("disables saving when there are no selected questions", () => {
  const view = preview(false);
  expect(view).toContain("Add selected (0)");
  expect(view).toMatch(/<button[^>]*disabled=""/);
});

test("locks the preview during a pending request", () => {
  const view = preview(true, true);
  expect(view).toMatch(/<fieldset[^>]*disabled=""/);
  expect(view).toContain("Please wait...");
});
