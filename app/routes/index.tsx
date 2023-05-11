import type { Question } from "@prisma/client";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/server-runtime";
import type { ActionFunction, LoaderFunction } from "@remix-run/server-runtime";
import React from "react";

import AppBar from "~/components/AppBar";
import Deck from "~/components/Deck";

import { getRandomQuestions, migrateQuestions } from "~/question.server";
import { getUserSession } from "~/session.server";
import QuestionCard from "~/components/Question";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserSession(request);
  await migrateQuestions();

  const questions = await getRandomQuestions();
  return { questions, user: user?.email };
};

type ActionData = { questions: Question[] };
export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const ignoreIds = formData.get("ignoredIds") as string;

  const newQuestions = await getRandomQuestions(ignoreIds.split(","));
  return json({ questions: newQuestions });
};

export default function Index() {
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
      <AppBar email={loaderData.user} />
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
              name="ignoredIds"
              value={questions.map((q: Question) => q.id)}
            />
          </Form>
        )}
      </main>
    </div>
  );
}
