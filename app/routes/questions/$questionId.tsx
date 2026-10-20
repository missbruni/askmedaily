import React from "react";
import { json, redirect } from "@remix-run/node";

import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { Form, useActionData, useCatch, useLoaderData } from "@remix-run/react";
import { UilTrashAlt } from "@iconscout/react-unicons";
import invariant from "tiny-invariant";

import { confirmBeforeSubmit } from "~/utils";
import { updateQuestion } from "~/question.server";
import { deleteQuestion } from "~/question.server";
import { getQuestion } from "~/question.server";

import type { Question } from "~/question.server";
import { getUserSession } from "~/session.server";

type LoaderData = {
  question: Question;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await getUserSession(request);
  invariant(params.questionId, "questionId not found");

  if (!user) throw new Response("Not Found", { status: 404 });

  const question = await getQuestion(params.questionId);

  if (!question) throw new Response("Not Found", { status: 404 });
  return json<LoaderData>({ question });
};

export const action: ActionFunction = async ({ request, params }) => {
  const user = await getUserSession(request);

  if (!user) throw new Response("Not Authorized", { status: 401 });

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
    await deleteQuestion(params.questionId, user.uid);
  } else if (user && formData.get("_method") === "save") {
    await updateQuestion(params.questionId, newQuestion, user.uid);
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
  const data = useLoaderData() as unknown as LoaderData;
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
      <p className="eyebrow">Edit your card</p>
      <h2 className="deck-manager__detail-title">Question Details</h2>
      <Form method="post" className="question-form">
        <div className="field">
          <label htmlFor="question" className="field-label">
            Question
          </label>
          <input
            id="question"
            defaultValue={data.question.question}
            ref={questionRef}
            name="question"
            className="text-field"
            aria-invalid={actionData?.errors?.question ? true : undefined}
            aria-errormessage={
              actionData?.errors?.question ? "question-error" : undefined
            }
          />
          {actionData?.errors?.question && (
            <p className="field-error" id="question-error">
              {actionData.errors.question}
            </p>
          )}
        </div>
        <div className="question-form__actions">
          <button
            name="_method"
            value="save"
            type="submit"
            className="button button--primary"
          >
            Save Changes
          </button>
          <button
            name="_method"
            value="delete"
            type="submit"
            className="button button--danger"
            onClick={confirmBeforeSubmit(
              "Delete this question from your deck?"
            )}
          >
            <UilTrashAlt size="16" aria-hidden="true" />
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
