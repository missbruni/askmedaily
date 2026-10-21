import type { ActionFunction } from "@remix-run/server-runtime";

import { saveQuestionProgress } from "~/question-progress.server";

export const action: ActionFunction = ({ request }) =>
  saveQuestionProgress(request);
