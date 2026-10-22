import { Form } from "@remix-run/react";

import { MAX_GENERATED_QUESTION_LENGTH } from "~/question-generation";
import type { QuestionDraft } from "~/question-generation";

type Props = {
  drafts: QuestionDraft[];
  onChange: (drafts: QuestionDraft[]) => void;
  busy: boolean;
};

export default function GeneratedQuestionPreview({
  drafts,
  onChange,
  busy,
}: Props) {
  const selectedCount = drafts.filter((draft) => draft.selected).length;
  const update = (index: number, changes: Partial<QuestionDraft>) =>
    onChange(
      drafts.map((draft, i) => (i === index ? { ...draft, ...changes } : draft))
    );

  return (
    <section
      className="question-import__preview"
      aria-label="Review generated questions"
    >
      <h3 className="question-import__preview-title">Review your questions</h3>
      <p className="question-import__intro">
        Keep the good ones, edit the rest, and check that every question is
        appropriate for your group. Duplicate wording is checked against your
        collection, not other people's questions or paraphrases.
      </p>
      <Form method="post">
        <input type="hidden" name="intent" value="save" />
        <fieldset className="question-generation__fields" disabled={busy}>
          <ol className="question-generation__drafts">
            {drafts.map((draft, index) => (
              <li key={index} className="question-generation__draft">
                <label className="question-generation__include">
                  <input
                    type="checkbox"
                    name="selected"
                    value={index}
                    checked={draft.selected}
                    onChange={(event) =>
                      update(index, { selected: event.currentTarget.checked })
                    }
                  />
                  Include question {index + 1}
                </label>
                <label className="field">
                  <span className="sr-only">Question {index + 1}</span>
                  <textarea
                    name="question"
                    className="text-field"
                    rows={3}
                    maxLength={MAX_GENERATED_QUESTION_LENGTH}
                    value={draft.question}
                    onChange={(event) =>
                      update(index, { question: event.currentTarget.value })
                    }
                  />
                </label>
              </li>
            ))}
          </ol>
          <button
            type="submit"
            className="button button--primary"
            disabled={selectedCount === 0}
          >
            {busy ? "Please wait..." : `Add selected (${selectedCount})`}
          </button>
        </fieldset>
      </Form>
    </section>
  );
}
