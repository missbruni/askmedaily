import { Question } from "@prisma/client";
import {
  Form,
  Link,
  Outlet,
  useActionData,
  useLoaderData,
} from "@remix-run/react";
import {
  ActionFunction,
  json,
  LoaderFunction,
} from "@remix-run/server-runtime";
import AppBar from "~/components/AppBar";
import LogoutButton from "~/components/Logout";
import { getRandomQuestion } from "~/models/question.server";

import { useOptionalUser } from "~/utils";

export const loader: LoaderFunction = async ({ request }) => {
  return { question: await getRandomQuestion() };
};

type ActionData = { question: Question };
export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();

  const questionId = formData.get("questionId") as string;
  const newQuestion = await getRandomQuestion(questionId);

  return json<ActionData>({ question: newQuestion });
};

export default function Index() {
  const user = useOptionalUser();
  const loaderData = useLoaderData();
  const actionData = useActionData<ActionData>();

  const question = actionData?.question || loaderData?.question;

  return (
    <div className="flex h-full min-h-screen flex-col">
      <AppBar user={user} />
      <main className="h-full bg-[aliceblue]">
        <div className="relative sm:pb-16 sm:pt-8">
          <div className="flex items-center justify-center sm:px-6 lg:px-8">
            <div className="relative inset-0 w-[700px] bg-[#252525] shadow-xl sm:overflow-hidden sm:rounded-2xl">
              <div className="lg:pb-18 flex flex-col items-center justify-center gap-20 px-4 pt-16 pb-8 sm:px-6 sm:pb-14 lg:px-8 lg:pt-32">
                <h6 className="text-center text-2xl font-extrabold tracking-tight">
                  <span className="block text-[#1dbab4] drop-shadow-md">
                    Question
                  </span>
                </h6>
                <h3 className="text-center text-3xl font-extrabold tracking-tight sm:text-3xl lg:text-5xl">
                  <span className="block text-white drop-shadow-md">
                    {question?.question || "No question found."}
                  </span>
                </h3>
                {Boolean(question) && (
                  <Form method="post">
                    <input
                      type="hidden"
                      name="questionId"
                      value={question?.id}
                    />
                    <button
                      type="submit"
                      className="flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-base font-medium text-[#1dbab4] shadow-sm hover:bg-[#e4f9f8]"
                    >
                      Next Question
                    </button>
                  </Form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
