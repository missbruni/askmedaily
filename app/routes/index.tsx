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

export default function Index() {
  const loaderData = useLoaderData();
  const actionData = useActionData<ActionData>();

  const formRef = React.useRef(null);
  const [currentCard, setCurrentCard] = React.useState(1);
  const questions = actionData?.questions || loaderData?.questions || [];

  const handleReshuffle = React.useCallback(() => {
    if (formRef.current) {
      (formRef.current as HTMLFormElement).submit();
    }
  }, []);

  return (
    <div className="app-shell home-shell">
      <AppBar
        email={loaderData.user}
        currentCard={currentCard}
        totalCards={questions.length}
      />
      <main className="home-stage">
        {questions.length > 0 ? (
          <>
            <Deck
              onFinish={handleReshuffle}
              onProgressChange={(nextCard) => setCurrentCard(nextCard)}
              cards={questions.map((question: Question, index: number) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  cardNumber={questions.length - index}
                />
              ))}
            />
            <p className="swipe-guide">
              <span className="swipe-guide__pass">&lt;- Pass</span>
              <span>Swipe the card</span>
              <span className="swipe-guide__keep">Keep -&gt;</span>
            </p>
          </>
        ) : (
          <section className="deck-empty">
            <p className="deck-manager__eyebrow">The table is set</p>
            <h1 className="deck-manager__title">Your deck is waiting.</h1>
            <p className="deck-manager__summary">
              Add a few questions and your first cards will be ready to play.
            </p>
            <Link
              to={loaderData.user ? "/questions/new" : "/join"}
              className="button button--primary mt-5"
            >
              {loaderData.user ? "Add a question" : "Create an account"}
            </Link>
          </section>
        )}
        {questions.length > 0 && (
          <Form method="post" ref={formRef}>
            <input
              type="hidden"
              name="ignoredIds"
              value={questions.map((question: Question) => question.id)}
            />
          </Form>
        )}
      </main>
    </div>
  );
}
