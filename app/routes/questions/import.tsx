import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import {
  json,
  MaxPartSizeExceededError,
  redirect,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { Form, Link, useActionData } from "@remix-run/react";

import { createQuestions } from "~/question.server";
import {
  MAX_QUESTION_IMPORT_BYTES,
  parseQuestionCsv,
} from "~/question-import.server";
import type { QuestionImportError } from "~/question-import.server";
import { getUserSession } from "~/session.server";

type ActionData = {
  errors?: QuestionImportError[];
  preview?: {
    csvContent: string;
    questions: string[];
  };
  importedCount?: number;
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserSession(request);
  if (!user) return redirect("/");
  return null;
};

export const action: ActionFunction = async ({ request }) => {
  const user = await getUserSession(request);
  if (!user) return redirect("/");

  let formData: FormData;
  try {
    const contentType = request.headers.get("Content-Type") ?? "";
    formData = contentType.startsWith("multipart/form-data")
      ? await unstable_parseMultipartFormData(
          request,
          unstable_createMemoryUploadHandler({
            maxPartSize: MAX_QUESTION_IMPORT_BYTES,
          })
        )
      : await request.formData();
  } catch (error) {
    if (error instanceof MaxPartSizeExceededError) {
      return json<ActionData>(
        { errors: [{ message: "CSV files must be 512 KB or smaller." }] },
        { status: 413 }
      );
    }
    throw error;
  }
  const intent = formData.get("intent");
  let csvContent: string;

  if (intent === "preview") {
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return json<ActionData>(
        { errors: [{ message: "Choose a CSV file to preview." }] },
        { status: 400 }
      );
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return json<ActionData>(
        { errors: [{ message: "Choose a .csv file." }] },
        { status: 400 }
      );
    }
    if (file.size > MAX_QUESTION_IMPORT_BYTES) {
      return json<ActionData>(
        { errors: [{ message: "CSV files must be 512 KB or smaller." }] },
        { status: 400 }
      );
    }

    csvContent = await file.text();
  } else if (intent === "import") {
    const submittedCsv = formData.get("csvContent");
    if (typeof submittedCsv !== "string") {
      return json<ActionData>(
        { errors: [{ message: "Preview a CSV file before importing." }] },
        { status: 400 }
      );
    }
    csvContent = submittedCsv;
  } else {
    return json<ActionData>(
      { errors: [{ message: "Choose whether to preview or import the CSV." }] },
      { status: 400 }
    );
  }

  const parsedCsv = parseQuestionCsv(csvContent);
  const preview = { csvContent, questions: parsedCsv.questions };
  if (parsedCsv.errors.length > 0) {
    return json<ActionData>(
      { errors: parsedCsv.errors, preview },
      { status: 400 }
    );
  }

  if (intent === "preview") return json<ActionData>({ preview });

  try {
    await createQuestions(parsedCsv.questions, user.uid);
  } catch (error) {
    console.error("Question CSV import failed", error);
    return json<ActionData>(
      {
        errors: [
          { message: "Could not save the questions. Please try again." },
        ],
        preview,
      },
      { status: 500 }
    );
  }

  return json<ActionData>({ importedCount: parsedCsv.questions.length });
};

export default function ImportQuestionsPage() {
  const actionData = useActionData<ActionData>();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Import questions</h1>
      <p className="mt-2">
        Upload a CSV with a single <code>question</code> column and one question
        per row. You can import up to 500 questions at a time.
      </p>

      <Form
        method="post"
        encType="multipart/form-data"
        className="mt-6 flex flex-col gap-4"
      >
        <input type="hidden" name="intent" value="preview" />
        <label className="flex flex-col gap-2">
          <span>CSV file (512 KB maximum)</span>
          <input
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="rounded-md border border-gray-400 p-2"
          />
        </label>
        <div>
          <button
            type="submit"
            className="rounded bg-blue-500 py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
          >
            Preview CSV
          </button>
        </div>
      </Form>

      {actionData?.errors && (
        <div
          className="mt-4 rounded-md bg-red-100 p-3 text-red-800"
          role="alert"
        >
          {actionData.errors.map((error, index) => (
            <p key={`${error.row ?? "file"}-${index}`}>
              {error.row ? `Row ${error.row}: ` : ""}
              {error.message}
            </p>
          ))}
        </div>
      )}

      {actionData?.preview && (
        <section className="mt-6">
          <h2 className="text-xl font-semibold">
            Preview ({actionData.preview.questions.length} questions)
          </h2>
          {actionData.preview.questions.length > 0 ? (
            <ol className="mt-3 max-h-96 list-inside list-decimal overflow-y-auto rounded border p-3">
              {actionData.preview.questions.map((question, index) => (
                <li key={`${index}-${question}`} className="py-1">
                  {question}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2">No valid questions to import.</p>
          )}

          {(!actionData.errors || actionData.errors.length === 0) &&
            actionData.preview.questions.length > 0 && (
              <Form method="post" className="mt-4">
                <input type="hidden" name="intent" value="import" />
                <input
                  type="hidden"
                  name="csvContent"
                  value={actionData.preview.csvContent}
                />
                <button
                  type="submit"
                  className="rounded bg-blue-500 py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
                >
                  Import {actionData.preview.questions.length} questions
                </button>
              </Form>
            )}
        </section>
      )}

      {typeof actionData?.importedCount === "number" && (
        <p className="mt-4 text-green-700" role="status">
          Imported {actionData.importedCount} questions.{" "}
          <Link to="/questions" className="underline">
            View your questions
          </Link>
        </p>
      )}
    </div>
  );
}
