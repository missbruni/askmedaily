import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, NavLink, Outlet, useLoaderData } from "@remix-run/react";

import { useUser } from "~/utils";
import {
  deleteQuestions,
  getQuestionListItems,
} from "~/models/question.server";
import AppBar from "~/components/AppBar";
import { getUser } from "~/auth.server";

type LoaderData = {
  questionListItems: Awaited<ReturnType<typeof getQuestionListItems>>;
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser();
  if (user) {
    const questionListItems = await getQuestionListItems({ userId: user?.uid });
    return json<LoaderData>({ questionListItems });
  }
  return redirect("/logout");
};

export const action: ActionFunction = async ({ request }) => {
  const user = await getUser();
  if (user) {
    await deleteQuestions({ userId: user?.uid });
    return redirect("/");
  }
};

export default function QuestionsPage() {
  const data = useLoaderData() as LoaderData;
  const user = useUser();

  return (
    <div className="flex h-full min-h-screen flex-col">
      <AppBar user={user} />

      <main className="flex h-full bg-white">
        <div className="h-full w-80 border-r bg-gray-50">
          <Link to="new" className="block p-4 text-xl text-blue-500">
            + New Question
          </Link>

          <hr />

          {data.questionListItems.length === 0 ? (
            <p className="p-4">No Questions yet</p>
          ) : (
            <>
              <ol className="h-[calc(100%-188px)] overflow-scroll">
                {data.questionListItems.map((question) => (
                  <li key={question.id}>
                    <NavLink
                      to={question.id}
                      className={({ isActive }) =>
                        `block border-b p-4 text-xl ${
                          isActive ? "bg-white" : ""
                        }`
                      }
                    >
                      {question.question}
                    </NavLink>
                  </li>
                ))}
              </ol>
              <Form method="post" className="absolute bottom-0 p-3">
                <button
                  type="submit"
                  className="rounded bg-red-500  py-2 px-4 text-white hover:bg-red-600 focus:bg-red-400"
                >
                  Delete All
                </button>
              </Form>
            </>
          )}
        </div>

        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
