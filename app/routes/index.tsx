import type { Question } from "@prisma/client";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/server-runtime";
import type { ActionFunction, LoaderFunction } from "@remix-run/server-runtime";
import React from "react";

import AppBar from "~/components/AppBar";
import Deck from "~/components/Deck";

import { getRandomQuestions } from "~/question.server";
import { getUserSession } from "~/session.server";
import QuestionCard from "~/components/Question";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserSession(request);

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

const NO_QUESTIONS: Question[] = [];

export default function Index() {
  const loaderData = useLoaderData();
  const actionData = useActionData<ActionData>();

  const formRef = React.useRef(null);
  const [currentCard, setCurrentCard] = React.useState(1);
  const questions: Question[] =
    actionData?.questions ?? loaderData?.questions ?? NO_QUESTIONS;

  const handleReshuffle = React.useCallback(() => {
    if (formRef.current) {
      (formRef.current as HTMLFormElement).submit();
    }
  }, []);

  const cards = React.useMemo(
    () =>
      questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          cardNumber={questions.length - index}
        />
      )),
    [questions]
  );

  return (
    <div className="app-shell play-shell">
      <AppBar
        email={loaderData.user}
        currentCard={currentCard}
        totalCards={questions.length}
      />
      <main className="play-stage">
        {questions.length > 0 ? (
          <>
            <Deck
              cards={cards}
              onFinish={handleReshuffle}
              onProgressChange={setCurrentCard}
            />
            <p className="swipe-hint">
              <span className="swipe-hint__icon" aria-hidden="true">
                ⇄
              </span>
              Slide or swipe card to reveal next
            </p>
            <Form method="post" ref={formRef}>
              <input
                type="hidden"
                name="ignoredIds"
                value={questions.map((question) => question.id)}
              />
            </Form>
          </>
        ) : (
          <section className="deck-empty">
            <p className="eyebrow">The table is set</p>
            <h1 className="display-title">Your deck is waiting.</h1>
            <p className="lead">
              Add a few questions and your first cards will be ready to play.
            </p>
            <Link
              to={loaderData.user ? "/questions/new" : "/join"}
              className="button button--primary"
            >
              {loaderData.user ? "Add a question" : "Create an account"}
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
