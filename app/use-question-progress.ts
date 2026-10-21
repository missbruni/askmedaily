import React from "react";

export function useQuestionProgress(round: string) {
  const queue = React.useRef(Promise.resolve());
  const latestId = React.useRef("");
  const [saveFailed, setSaveFailed] = React.useState(false);
  const [finished, setFinished] = React.useState(false);

  const save = React.useCallback(
    (questionId: string) => {
      latestId.current = questionId;
      // Serialize writes so a slower response cannot replace a newer cookie.
      const pending = queue.current
        .catch(() => {})
        .then(async () => {
          const response = await fetch("/question-progress", {
            method: "POST",
            body: new URLSearchParams({ round, questionId }),
            credentials: "same-origin",
            keepalive: true,
          });
          if (!response.ok) throw new Error("Could not save question progress");
        });
      queue.current = pending;
      void pending.then(
        () => setSaveFailed(false),
        () => setSaveFailed(true)
      );
      return pending;
    },
    [round]
  );

  const finish = React.useCallback(() => {
    setFinished(true);
    void queue.current.then(
      () => window.location.reload(),
      () => setSaveFailed(true)
    );
  }, []);

  const retry = React.useCallback(() => {
    void save(latestId.current).then(
      () => {
        if (finished) window.location.reload();
      },
      () => {}
    );
  }, [finished, save]);

  return { save, finish, retry, saveFailed };
}
