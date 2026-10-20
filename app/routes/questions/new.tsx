import * as React from "react";

import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";

import { createQuestion } from "~/question.server";
import { getUserSession } from "~/session.server";

type LoaderData = {
  user?: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserSession(request);

  if (!user) return redirect("/");
  return json<LoaderData>({ user: user?.email });
};

type ActionData = {
  errors?: {
    question?: string;
  };
};

export const action: ActionFunction = async ({ request }) => {
  const user = await getUserSession(request);

  if (!user) return redirect("/");

  const formData = await request.formData();
  const newQuestion = formData.get("question");

  if (typeof newQuestion !== "string" || newQuestion.length === 0) {
    return json<ActionData>(
      { errors: { question: "Question is required" } },
      { status: 400 }
    );
  }

  await createQuestion(newQuestion, user.uid);
  return redirect(`/questions`);
};

export default function NewQuestionPage() {
  const actionData = useActionData() as ActionData;
  const questionRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    questionRef.current?.focus();
  }, []);
  React.useEffect(() => {
    if (actionData?.errors?.question) {
      questionRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div>
      <p className="deck-manager__eyebrow">Add to the collection</p>
      <h2 className="deck-manager__editor-title">New Question</h2>
      <Form method="post" className="question-form">
        <div className="question-form__field">
          <label htmlFor="question" className="question-form__label">
            Question
          </label>
          <input
            id="question"
            ref={questionRef}
            name="question"
            className="text-field"
            aria-invalid={actionData?.errors?.question ? true : undefined}
            aria-errormessage={
              actionData?.errors?.question ? "question-error" : undefined
            }
          />
          {actionData?.errors?.question && (
            <p className="form-error" id="question-error">
              {actionData.errors.question}
            </p>
          )}
        </div>
        <div className="question-form__actions">
          <button type="submit" className="button button--primary">
            Save Question
          </button>
        </div>
      </Form>
    </div>
  );
}
