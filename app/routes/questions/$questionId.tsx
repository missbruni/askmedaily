import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useCatch, useLoaderData } from "@remix-run/react";
import React from "react";
import invariant from "tiny-invariant";

import { Question, updateQuestion } from "~/models/question.server";
import { deleteQuestion } from "~/models/question.server";
import { getQuestion } from "~/models/question.server";
import { requireUserId } from "~/session.server";

type LoaderData = {
  question: Question;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.questionId, "questionId not found");

  const question = await getQuestion({ userId, id: params.questionId });
  if (!question) {
    throw new Response("Not Found", { status: 404 });
  }
  return json<LoaderData>({ question });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const newQuestion = formData.get("question");

  if (typeof newQuestion !== "string" || newQuestion.length === 0) {
    return json<ActionData>(
      { errors: { question: "Question is required" } },
      { status: 400 }
    );
  }

  invariant(params.questionId, "questionId not found");

  if (formData.get("_method") === "delete") {
    await deleteQuestion({ userId, id: params.questionId });
  }

  if (formData.get("_method") === "save") {
    await updateQuestion({
      id: params.questionId,
      question: newQuestion,
      userId,
    });
  }

  return redirect("/questions");
};

type ActionData = {
  errors?: {
    question?: string;
  };
};

export default function QuestionDetailsPage() {
  const actionData = useActionData() as ActionData;
  const data = useLoaderData() as LoaderData;
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
              defaultValue={data.question.question}
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
        <div className="flex items-center justify-end gap-1">
          <button
            name="_method"
            value="save"
            type="submit"
            className="rounded bg-blue-500 py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
          >
            Save
          </button>
          <button
            name="_method"
            value="delete"
            type="submit"
            className="rounded bg-red-500  py-2 px-4 text-white hover:bg-red-600 focus:bg-red-400"
          >
            Delete
          </button>
        </div>
      </Form>
    </div>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);

  return <div>An unexpected error occurred: {error.message}</div>;
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 404) {
    return <div>Question not found</div>;
  }

  throw new Error(`Unexpected caught response with status: ${caught.status}`);
}
