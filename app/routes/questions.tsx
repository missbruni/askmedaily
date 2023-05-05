<<<<<<< Updated upstream
import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
=======
import {
  ActionFunction,
  LoaderFunction,
  json,
  redirect,
} from "@remix-run/node";
>>>>>>> Stashed changes
import { Form, Link, NavLink, Outlet, useLoaderData } from "@remix-run/react";

import { getQuestionListItems } from "~/models/question.server";
import AppBar from "~/components/AppBar";
import { getUserSession } from "~/session.server";
import { User } from "firebase/auth";

type LoaderData = {
  questionListItems: Awaited<ReturnType<typeof getQuestionListItems>>;
  initial?: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserSession(request);

  if (user) {
    const questionListItems = await getQuestionListItems(user.uid);
    return json<LoaderData>({ questionListItems, initial: user.email?.[0] });
  }
  return redirect("/logout");
};

export const action: ActionFunction = async ({ request }) => {
  // const user = await getUser();
  // if (user) {
  //   await deleteQuestions({ userId: user?.uid });
  //   return redirect("/");
  // }
};

export default function QuestionsPage() {
  const data = useLoaderData() as LoaderData;

  return (
    <div className="flex h-full min-h-screen flex-col">
      <AppBar userInitial={data.initial} />

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
                {data.questionListItems.map((question: any) => (
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
