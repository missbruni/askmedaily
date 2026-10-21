import { Link, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/server-runtime";
import type { LoaderArgs } from "@remix-run/server-runtime";
import React from "react";

import AppBar from "~/components/AppBar";
import Deck from "~/components/Deck";

import { loadQuestionDeck } from "~/question-progress.server";
import { getUserSession } from "~/session.server";
import QuestionCard from "~/components/Question";
import { useQuestionProgress } from "~/use-question-progress";

export const loader = async ({ request }: LoaderArgs) => {
  const user = await getUserSession(request);

  const { questions, round, cookie } = await loadQuestionDeck(request);
  return json(
    { questions, round, user: user?.email },
    { headers: { "Set-Cookie": cookie, "Cache-Control": "no-store" } }
  );
};

export default function Index() {
  const loaderData = useLoaderData<typeof loader>();
  const { questions, round } = loaderData;
  const [currentCard, setCurrentCard] = React.useState(1);
  const { save, finish, retry, saveFailed } = useQuestionProgress(round);
  const handleSwipe = React.useCallback(
    (index: number) => {
      void save(questions[questions.length - 1 - index].id);
    },
    [questions, save]
  );

  const cards = React.useMemo(
    () =>
      [...questions]
        .reverse()
        .map((question, index) => (
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
              onFinish={finish}
              onProgressChange={setCurrentCard}
              onSwipe={handleSwipe}
            />
            {saveFailed ? (
              <p className="swipe-hint swipe-hint--error" role="alert">
                Progress could not be saved.{" "}
                <button type="button" onClick={retry}>
                  Retry
                </button>
              </p>
            ) : (
              <p className="swipe-hint">
                <span className="swipe-hint__icon" aria-hidden="true">
                  ⇄
                </span>
                Slide or swipe card to reveal next
              </p>
            )}
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
