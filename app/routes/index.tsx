import { Question } from "@prisma/client";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  ActionFunction,
  json,
  LoaderFunction,
} from "@remix-run/server-runtime";
import React from "react";

import AppBar from "~/components/AppBar";
import Deck from "~/components/Deck";

import QuestionCard from "~/components/Question";
import { getRandomQuestions } from "~/models/question.server";

import { useOptionalUser } from "~/utils";

export const loader: LoaderFunction = async () => {
  return { questions: await getRandomQuestions() };
};

type ActionData = { questions: Question[] };
export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();

  const questionIds = formData.get("questionIds") as string;
  const newQuestions = await getRandomQuestions(questionIds.split(","));

  return json({ questions: newQuestions });
};

export default function Index() {
  const user = useOptionalUser();
  const loaderData = useLoaderData();
  const actionData = useActionData<ActionData>();

  const formRef = React.useRef(null);
  const questions = actionData?.questions || loaderData?.questions;

  const handleReshuffle = React.useCallback(() => {
    if (formRef.current) {
      (formRef.current as HTMLFormElement).submit();
    }
  }, []);

  return (
    <div className="flex h-full min-h-screen flex-col">
      <AppBar user={user} />
      <main className="h-full w-full bg-[aliceblue]">
        <Deck
          onFinish={handleReshuffle}
          cards={questions.map((q: Question) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        ></Deck>
        {Boolean(questions) && (
          <Form method="post" ref={formRef}>
            <input
              type="hidden"
              name="questionIds"
              value={questions.map((q: Question) => q.id)}
            />
          </Form>
        )}
      </main>
    </div>
  );
}
