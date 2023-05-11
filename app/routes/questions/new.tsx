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
    <Form
      method="post"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
      }}
    >
      <div>
        <label className="flex w-full flex-col gap-1">
          <span>Question: </span>
          <input
            ref={questionRef}
            name="question"
            className="flex-1 rounded-md border-2 border-blue-500 px-3 text-lg leading-loose"
            aria-invalid={actionData?.errors?.question ? true : undefined}
            aria-errormessage={
              actionData?.errors?.question ? "question-error" : undefined
            }
          />
        </label>
        {actionData?.errors?.question && (
          <div className="pt-1 text-red-700" id="question-error">
            {actionData.errors.question}
          </div>
        )}
      </div>
      <div className="text-right">
        <button
          type="submit"
          className="rounded bg-blue-500 py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
        >
          Save
        </button>
      </div>
    </Form>
  );
}
