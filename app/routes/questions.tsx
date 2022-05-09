import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, NavLink, Outlet, useLoaderData } from "@remix-run/react";

import { requireUserId } from "~/session.server";
import { useUser } from "~/utils";
import { getQuestionListItems } from "~/models/question.server";
import LogoutButton from "~/components/Logout";

type LoaderData = {
  questionListItems: Awaited<ReturnType<typeof getQuestionListItems>>;
};

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  const questionListItems = await getQuestionListItems({ userId });
  return json<LoaderData>({ questionListItems });
};

export default function QuestionsPage() {
  const data = useLoaderData() as LoaderData;
  const user = useUser();

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="flex items-center justify-between bg-gray-900 p-3 text-white">
        <h1 className="text-3xl font-bold">
          <Link to="">Questions</Link>
        </h1>
        <p>{user.email}</p>
        <LogoutButton />
      </header>

      <main className="flex h-full bg-white">
        <div className="h-full w-80 border-r bg-gray-50">
          <Link to="new" className="block p-4 text-xl text-blue-500">
            + New Question
          </Link>

          <hr />

          {data.questionListItems.length === 0 ? (
            <p className="p-4">No Questions yet</p>
          ) : (
            <ol>
              {data.questionListItems.map((question) => (
                <li key={question.id}>
                  <NavLink
                    className={({ isActive }) =>
                      `block border-b p-4 text-xl ${isActive ? "bg-white" : ""}`
                    }
                    to={question.id}
                  >
                    📝 {question.question}
                  </NavLink>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
