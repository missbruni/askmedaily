import { json, redirect } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";

import { createQuestions, getQuestionsByUser } from "~/question.server";
import {
  GENERATION_COUNTS,
  MAX_GENERATION_TOPIC_LENGTH,
  normalizeQuestion,
  validateQuestionDrafts,
} from "~/question-generation";
import { generateQuestionSuggestions } from "~/question-generation.server";
import { QuestionGenerationError } from "~/question-generation-limit.server";
import GeneratedQuestionPreview from "~/components/GeneratedQuestionPreview";
import { getUserSession } from "~/session.server";
import { hasAllowedOrigin } from "~/request-origin.server";
import type { QuestionDraft } from "~/question-generation";

type ActionData = {
  error?: string;
  drafts?: QuestionDraft[];
  savedCount?: number;
  filteredCount?: number;
};

export const loader: LoaderFunction = async ({ request }) => {
  if (!(await getUserSession(request))) return redirect("/");
  return json(
    { enabled: Boolean(process.env.GEMINI_API_KEY?.trim()) },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
};

export const action: ActionFunction = async ({ request }) => {
  const user = await getUserSession(request);
  if (!user) return redirect("/");
  if (!hasAllowedOrigin(request)) {
    return json<ActionData>(
      { error: "This request is not allowed." },
      { status: 403 }
    );
  }
  if (
    !request.headers
      .get("Content-Type")
      ?.startsWith("application/x-www-form-urlencoded")
  ) {
    return json<ActionData>(
      { error: "Submit the question form to continue." },
      { status: 415 }
    );
  }
  const body = await request.text();
  if (body.length > 64 * 1024) {
    return json<ActionData>(
      { error: "This question batch is too large." },
      { status: 413 }
    );
  }
  const form = new URLSearchParams(body);
  const intent = form.get("intent");
  let drafts: QuestionDraft[] | undefined;

  try {
    if (intent === "generate") {
      const topic = (form.get("topic") ?? "").trim();
      const count = Number(form.get("count"));
      if (
        topic.length > MAX_GENERATION_TOPIC_LENGTH ||
        !GENERATION_COUNTS.includes(count)
      ) {
        return json<ActionData>(
          {
            error:
              "Use a topic of up to 200 characters and choose 5, 10, or 20 questions.",
          },
          { status: 400 }
        );
      }
      const existing = await getQuestionsByUser(user.uid);
      const known = new Set(
        existing.map(({ question }) => normalizeQuestion(question))
      );
      const suggestions = await generateQuestionSuggestions({
        userId: user.uid,
        topic,
        count,
      });
      const fresh = suggestions.filter(
        (question) => !known.has(normalizeQuestion(question))
      );
      if (fresh.length === 0) {
        return json<ActionData>(
          {
            error:
              "These suggestions are already in your collection. Try a different topic.",
          },
          { status: 422 }
        );
      }
      return json<ActionData>({
        drafts: fresh.map((question) => ({ question, selected: true })),
        filteredCount: suggestions.length - fresh.length,
      });
    }

    if (intent !== "save") {
      return json<ActionData>(
        { error: "Choose whether to generate or add questions." },
        { status: 400 }
      );
    }
    const values = form.getAll("question");
    const selected = new Set(form.getAll("selected"));
    if (
      values.length > 20 ||
      [...selected].some(
        (value) => !/^\d+$/.test(value) || Number(value) >= values.length
      )
    ) {
      return json<ActionData>(
        { error: "Select from the current preview." },
        { status: 400 }
      );
    }
    drafts = values.map((question, index) => ({
      question,
      selected: selected.has(String(index)),
    }));
    const validated = validateQuestionDrafts(
      drafts.filter((draft) => draft.selected).map((draft) => draft.question)
    );
    if (validated.error) {
      return json<ActionData>(
        { error: validated.error, drafts },
        { status: 400 }
      );
    }
    const existing = await getQuestionsByUser(user.uid);
    const known = new Set(
      existing.map(({ question }) => normalizeQuestion(question))
    );
    if (
      validated.questions.some((question) =>
        known.has(normalizeQuestion(question))
      )
    ) {
      return json<ActionData>(
        {
          error:
            "A selected question is already in your collection. Edit or deselect it.",
          drafts,
        },
        { status: 400 }
      );
    }
    await createQuestions(validated.questions, user.uid);
    return json<ActionData>({ savedCount: validated.questions.length });
  } catch (error) {
    if (error instanceof QuestionGenerationError) {
      return json<ActionData>(
        { error: error.message },
        {
          status: error.status,
          headers: error.retryAfter
            ? { "Retry-After": String(error.retryAfter) }
            : {},
        }
      );
    }
    return json<ActionData>(
      {
        error: drafts
          ? "Could not save these questions. Your preview has been kept; check your collection before trying again."
          : "Could not generate questions. Please try again later.",
        drafts,
      },
      { status: 500 }
    );
  }
};

export default function GenerateQuestionsPage() {
  const { enabled } = useLoaderData<{ enabled: boolean }>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const generating = busy && navigation.formData?.get("intent") === "generate";
  const [drafts, setDrafts] = useState<QuestionDraft[]>(
    actionData?.drafts ?? []
  );
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (actionData?.drafts) setDrafts(actionData.drafts);
    else if (typeof actionData?.savedCount === "number") setDrafts([]);
    if (actionData?.error) errorRef.current?.focus();
  }, [actionData]);

  return (
    <div className="question-import question-generation">
      <div>
        <p className="eyebrow">A little inspiration</p>
        <h2 className="deck-manager__detail-title">Generate with AI</h2>
        <p className="question-import__intro">
          Let Gemini suggest a few icebreakers. Review and edit them before
          adding your favorites to the shared question pool. Nothing is added
          automatically.
        </p>
      </div>
      {!enabled && (
        <p className="form-message" role="status">
          AI generation is not configured yet. The site owner needs to add a
          Gemini API key. You can still add questions manually or import a CSV.
        </p>
      )}
      <Form method="post" className="question-form">
        <input type="hidden" name="intent" value="generate" />
        <fieldset
          className="question-generation__fields"
          disabled={busy || !enabled}
        >
          <label className="field" htmlFor="generation-topic">
            <span className="field-label">
              Topic <span className="question-import__limit">optional</span>
            </span>
            <input
              id="generation-topic"
              name="topic"
              className="text-field"
              maxLength={MAX_GENERATION_TOPIC_LENGTH}
              placeholder="e.g. fun icebreakers or getting to know your team"
            />
          </label>
          <label className="field" htmlFor="generation-count">
            <span className="field-label">Number of questions</span>
            <select
              id="generation-count"
              name="count"
              defaultValue="10"
              className="text-field"
            >
              {GENERATION_COUNTS.map((count) => (
                <option key={count} value={count}>
                  {count} questions
                </option>
              ))}
            </select>
          </label>
          <p className="question-import__intro">
            Your topic is sent to Google Gemini. Avoid personal or confidential
            details. Up to 5 requests per day per person, with a minute between
            requests. Generating again replaces the current preview.
          </p>
          <div className="question-form__actions">
            <button className="button button--primary" type="submit">
              {generating ? "Generating..." : "Generate questions"}
            </button>
          </div>
        </fieldset>
      </Form>
      {actionData?.error && (
        <p
          ref={errorRef}
          tabIndex={-1}
          className="form-message form-message--error"
          role="alert"
        >
          {actionData.error}
        </p>
      )}
      {drafts.length > 0 && (
        <GeneratedQuestionPreview
          drafts={drafts}
          onChange={setDrafts}
          busy={busy}
        />
      )}
      {Boolean(actionData?.filteredCount) && drafts.length > 0 && (
        <p className="question-import__intro">
          {actionData?.filteredCount} suggestions already in your collection
          were left out.
        </p>
      )}
      {typeof actionData?.savedCount === "number" && (
        <p className="form-message form-message--success" role="status">
          Added {actionData.savedCount} questions. They are now in your
          collection and the shared pool.
        </p>
      )}
    </div>
  );
}
