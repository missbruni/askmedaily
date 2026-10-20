import { json, redirect } from "@remix-run/node";
import { Form, Link, NavLink, Outlet, useLoaderData } from "@remix-run/react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { useState } from "react";

import { deleteQuestions, getQuestionsByUser } from "~/question.server";
import { getUserSession } from "~/session.server";
import AppBar from "~/components/AppBar";

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

export default function QuestionsPage() {
  const data = useLoaderData() as LoaderData;
  const [search, setSearch] = useState("");
  const filteredQuestions = data.questionListItems.filter((question) =>
    question.question.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="app-shell">
      <AppBar email={data.user} />

      <main className="deck-manager">
        <header className="deck-manager__header">
          <div>
            <p className="deck-manager__eyebrow">Your collection</p>
            <h1 className="deck-manager__title">Question Deck</h1>
            <p className="deck-manager__summary">
              {data.questionListItems.length}{" "}
              {data.questionListItems.length === 1 ? "card" : "cards"} in your
              deck
            </p>
          </div>
          <div className="deck-manager__actions">
            <Link to="new" className="button button--primary">
              + New Question
            </Link>
            <Link to="import" className="button">
              Import CSV
            </Link>
          </div>
        </header>

        <div className="deck-manager__grid">
          <aside className="deck-manager__panel deck-manager__list-panel">
            <div className="deck-manager__list-controls">
              <span className="deck-manager__all-pill">
                All questions / {data.questionListItems.length}
              </span>
              <label>
                <span className="sr-only">Search your questions</span>
                <input
                  className="deck-manager__search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                  placeholder="Find in your deck"
                />
              </label>
            </div>

            {filteredQuestions.length > 0 ? (
              <ol className="deck-manager__question-list">
                {filteredQuestions.map((question, index) => (
                  <li key={question.id}>
                    <NavLink
                      to={question.id}
                      className={({ isActive }) =>
                        `deck-question-link${isActive ? " is-active" : ""}`
                      }
                    >
                      <span className="deck-question-link__number">
                        #{String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="deck-question-link__text">
                        {question.question}
                      </span>
                      <span className="deck-question-link__edit">Edit</span>
                    </NavLink>
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

            {data.questionListItems.length > 0 && (
              <footer className="deck-manager__list-footer">
                <span>{data.questionListItems.length} TOTAL CARDS</span>
                <Form method="post">
                  <button type="submit" className="button button--danger">
                    Clear deck
                  </button>
                </Form>
              </footer>
            )}
          </aside>

          <section className="deck-manager__panel deck-manager__editor">
            <Outlet />
          </section>
        </div>
      </main>
    </div>
  );
}
