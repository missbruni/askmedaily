import { json, redirect } from "@remix-run/node";
import {
  Form,
  Link,
  NavLink,
  Outlet,
  useLoaderData,
  useLocation,
} from "@remix-run/react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { useState } from "react";
import {
  UilFileImport,
  UilPen,
  UilPlus,
  UilSearch,
  UilTrashAlt,
} from "@iconscout/react-unicons";

import { deleteQuestions, getQuestionsByUser } from "~/question.server";
import { getUserSession } from "~/session.server";
import AppBar from "~/components/AppBar";
import { confirmBeforeSubmit, formatCardNumber } from "~/utils";

type LoaderData = {
  questionListItems: Awaited<ReturnType<typeof getQuestionsByUser>>;
  user?: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserSession(request);

  if (user) {
    const questionListItems = await getQuestionsByUser(user.uid);
    return json<LoaderData>({ questionListItems, user: user?.email });
  }

  return redirect("/");
};

export const action: ActionFunction = async ({ request }) => {
  const user = await getUserSession(request);

  if (user) {
    await deleteQuestions(user?.uid);
    return redirect("/");
  }
};

const formatCardCount = (count: number) =>
  `${count} ${count === 1 ? "card" : "cards"}`;

export default function QuestionsPage() {
  const data = useLoaderData() as LoaderData;
  const location = useLocation();
  const [search, setSearch] = useState("");

  const totalCards = data.questionListItems.length;
  const hasDetail = location.pathname.replace(/\/$/, "") !== "/questions";
  const query = search.trim().toLowerCase();
  const visibleQuestions = data.questionListItems
    .map((question, index) => ({ question, number: index + 1 }))
    .filter(({ question }) => question.question.toLowerCase().includes(query));

  return (
    <div className="app-shell">
      <AppBar email={data.user} />

      <main className="deck-manager">
        <header className="deck-manager__header">
          <div>
            <p className="eyebrow">Your collection</p>
            <h1 className="deck-manager__title">
              Question Deck
              <span className="deck-manager__count">
                {formatCardCount(totalCards)}
              </span>
            </h1>
          </div>
          <div className="deck-manager__actions">
            <Link to="new" className="button button--primary">
              <UilPlus size="16" aria-hidden="true" />
              New Question
            </Link>
            <Link to="import" className="button button--outline">
              <UilFileImport size="16" aria-hidden="true" />
              Import CSV
            </Link>
          </div>
        </header>

        <div
          className={`deck-manager__grid${
            hasDetail ? " deck-manager__grid--detail" : ""
          }`}
        >
          <section className="deck-manager__list" aria-label="Your questions">
            <label className="search-field">
              <span className="sr-only">Search your questions</span>
              <UilSearch
                className="search-field__icon"
                size="16"
                aria-hidden="true"
              />
              <input
                className="text-field search-field__input"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search your deck"
              />
            </label>

            <div className="deck-manager__pills">
              <span className="pill pill--active">All ({totalCards})</span>
            </div>

            {visibleQuestions.length > 0 ? (
              <ol className="deck-list">
                {visibleQuestions.map(({ question, number }) => (
                  <li key={question.id} className="deck-row">
                    <NavLink to={question.id} className="deck-row__link">
                      <span className="deck-row__number">
                        {formatCardNumber(number)}
                      </span>
                      <span className="deck-row__text">
                        {question.question}
                      </span>
                      <UilPen
                        className="deck-row__edit"
                        size="16"
                        aria-hidden="true"
                      />
                    </NavLink>
                    <Form
                      method="post"
                      action={`/questions/${question.id}`}
                      className="deck-row__delete"
                      onSubmit={confirmBeforeSubmit(
                        "Delete this question from your deck?"
                      )}
                    >
                      <input type="hidden" name="_method" value="delete" />
                      <input
                        type="hidden"
                        name="question"
                        value={question.question}
                      />
                      <button
                        type="submit"
                        className="icon-button icon-button--danger"
                        aria-label={`Delete question ${formatCardNumber(
                          number
                        )}`}
                        title="Delete question"
                      >
                        <UilTrashAlt size="16" aria-hidden="true" />
                      </button>
                    </Form>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="deck-manager__empty">
                {search
                  ? "No questions match your search."
                  : "Your deck is empty."}
              </p>
            )}

            {totalCards > 0 && (
              <footer className="deck-manager__status">
                <span>{formatCardCount(totalCards)} in deck</span>
                <Form
                  method="post"
                  onSubmit={confirmBeforeSubmit(
                    `Delete all ${formatCardCount(
                      totalCards
                    )} from your deck? This can't be undone.`
                  )}
                >
                  <button
                    type="submit"
                    className="text-button text-button--danger"
                  >
                    Clear deck
                  </button>
                </Form>
              </footer>
            )}
          </section>

          <section className="deck-manager__detail">
            <Outlet />
          </section>
        </div>
      </main>
    </div>
  );
}
