import { createHash, randomBytes } from "node:crypto";

export type QuestionDeck = {
  seed: string;
  cursor: string;
  last: string;
};

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const position = (seed: string, id: string) => digest(`${seed}:${id}`);

export function parseQuestionDeck(value: unknown): QuestionDeck | undefined {
  if (!value || typeof value !== "object") return;
  const { seed, cursor, last } = value as QuestionDeck;
  if (
    typeof seed !== "string" ||
    !/^[a-f0-9]{32}$/.test(seed) ||
    typeof cursor !== "string" ||
    !/^(|[a-f0-9]{64})$/.test(cursor) ||
    typeof last !== "string" ||
    !/^(|[a-f0-9]{64})$/.test(last)
  ) {
    return;
  }
  return { seed, cursor, last };
}

export function dealQuestionIds(ids: string[], previous?: QuestionDeck) {
  let deck = previous;
  let ordered = deck ? order(ids, deck.seed) : [];
  let remaining = ordered.filter(({ key }) => key > (deck?.cursor ?? ""));

  if (!deck || (remaining.length === 0 && ids.length > 0)) {
    do {
      deck = {
        seed: randomBytes(16).toString("hex"),
        cursor: "",
        last: previous?.last ?? "",
      };
      ordered = order(ids, deck.seed);
    } while (ordered.length > 1 && digest(ordered[0].id) === previous?.last);
    remaining = ordered;
  }

  return { deck, ids: remaining.slice(0, 5).map(({ id }) => id) };
}

export function advanceQuestionDeck(
  deck: QuestionDeck,
  seed: string,
  id: string
): QuestionDeck {
  const cursor = position(seed, id);
  if (seed !== deck.seed || cursor <= deck.cursor) return deck;
  return { ...deck, cursor, last: digest(id) };
}

function order(ids: string[], seed: string) {
  // Stable random ranks let additions and deletions leave the bookmark intact.
  return [...new Set(ids)]
    .map((id) => ({ id, key: position(seed, id) }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}
