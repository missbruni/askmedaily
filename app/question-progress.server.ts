import { createCookie } from "@remix-run/node";
import invariant from "tiny-invariant";

import {
  advanceQuestionDeck,
  dealQuestionIds,
  parseQuestionDeck,
} from "~/question-deck.server";
import { getQuestionIds, getQuestionsByIds } from "~/question.server";
import { hasAllowedOrigin } from "~/request-origin.server";

invariant(process.env.SESSION_SECRET, "SESSION_SECRET must be set");

const progressCookie = createCookie("__question_deck", {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  secrets: [process.env.SESSION_SECRET],
  maxAge: 60 * 60 * 24 * 365,
});

export async function loadQuestionDeck(request: Request) {
  const previous = parseQuestionDeck(
    await progressCookie.parse(request.headers.get("Cookie"))
  );
  let available = await getQuestionIds();
  let selection = dealQuestionIds(available, previous);
  let questions = await getQuestionsByIds(selection.ids);

  // Cached IDs can outlive deleted documents; prune them before finalizing a round.
  while (questions.length < selection.ids.length) {
    const found = new Set(questions.map(({ id }) => id));
    const missing = new Set(selection.ids.filter((id) => !found.has(id)));
    available = available.filter((id) => !missing.has(id));
    selection = dealQuestionIds(available, previous);
    questions = await getQuestionsByIds(selection.ids);
  }

  return {
    questions,
    round: selection.deck.seed,
    cookie: await progressCookie.serialize(selection.deck),
  };
}

export async function saveQuestionProgress(request: Request) {
  if (!hasAllowedOrigin(request)) {
    return new Response(null, { status: 403 });
  }

  const form = await request.formData();
  const round = form.get("round");
  const id = form.get("questionId");
  if (
    typeof round !== "string" ||
    !/^[a-f0-9]{32}$/.test(round) ||
    typeof id !== "string" ||
    !id ||
    id.length > 1500
  ) {
    return new Response(null, { status: 400 });
  }

  const deck = parseQuestionDeck(
    await progressCookie.parse(request.headers.get("Cookie"))
  );
  if (!deck || deck.seed !== round) {
    return new Response(null, { status: 409 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": await progressCookie.serialize(
        advanceQuestionDeck(deck, round, id)
      ),
    },
  });
}
