import {
  advanceQuestionDeck,
  dealQuestionIds,
  parseQuestionDeck,
} from "./question-deck.server";

import type { QuestionDeck } from "./question-deck.server";

const ids = Array.from({ length: 23 }, (_, index) => `question-${index}`);
const initial = { seed: "a".repeat(32), cursor: "", last: "" };

function consume(pool: string[], previous: QuestionDeck) {
  const result = dealQuestionIds(pool, previous);
  let deck = result.deck;
  for (const id of result.ids) {
    deck = advanceQuestionDeck(deck, deck.seed, id);
  }
  return { ids: result.ids, deck };
}

test("deals every question exactly once before starting a new shuffled round", () => {
  let deck = initial;
  const seen: string[] = [];
  for (let batch = 0; batch < 5; batch++) {
    const result = consume(ids, deck);
    seen.push(...result.ids);
    deck = result.deck;
    expect(deck.seed).toBe(initial.seed);
  }

  expect(new Set(seen).size).toBe(ids.length);
  expect(seen).toHaveLength(ids.length);
  const next = dealQuestionIds(ids, deck);
  expect(next.deck.seed).not.toBe(initial.seed);
  expect(next.ids[0]).not.toBe(seen[seen.length - 1]);
});

test("reloads resume after swiped cards without skipping the rest of the batch", () => {
  const first = dealQuestionIds(ids, initial);
  let deck = advanceQuestionDeck(first.deck, first.deck.seed, first.ids[0]);
  deck = advanceQuestionDeck(deck, deck.seed, first.ids[1]);

  expect(dealQuestionIds([...ids].reverse(), deck).ids.slice(0, 3)).toEqual(
    first.ids.slice(2)
  );
  expect(dealQuestionIds(ids, first.deck)).toEqual(first);
});

test("different browser seeds produce different stable orders", () => {
  const first = dealQuestionIds(ids, initial);
  expect(dealQuestionIds(ids, initial)).toEqual(first);
  expect(
    dealQuestionIds(ids, { ...initial, seed: "b".repeat(32) }).ids
  ).not.toEqual(first.ids);
});

test.each([0, 1, 2, 4, 5, 6])("handles a pool of %i questions", (size) => {
  const pool = ids.slice(0, size);
  let deck = initial;
  const seen: string[] = [];
  while (seen.length < size) {
    const result = consume(pool, deck);
    seen.push(...result.ids);
    deck = result.deck;
  }
  expect(new Set(seen).size).toBe(size);
  const next = dealQuestionIds(pool, deck);
  expect(next.ids).toHaveLength(Math.min(5, size));
  expect(size > 1 && next.ids[0] === seen[seen.length - 1]).toBe(false);
});

test("additions and deletions never repeat consumed cards within a round", () => {
  const first = consume(ids, initial);
  const changed = [...ids.slice(1), "new-a", "new-b", "new-c"];
  let deck = first.deck;
  const seen = new Set(first.ids);
  const round = deck.seed;

  for (let batch = 0; batch < 10; batch++) {
    const next = dealQuestionIds(changed, deck);
    if (next.deck.seed !== round) break;
    for (const id of next.ids) {
      expect(seen.has(id)).toBe(false);
      expect(changed).toContain(id);
      seen.add(id);
      deck = advanceQuestionDeck(deck, round, id);
    }
  }
  expect(seen.size).toBeGreaterThan(first.ids.length);
});

test("duplicate swipes, older progress, and old rounds cannot move a bookmark backwards", () => {
  const first = dealQuestionIds(ids, initial);
  const deck = advanceQuestionDeck(first.deck, first.deck.seed, first.ids[2]);
  expect(advanceQuestionDeck(deck, deck.seed, first.ids[0])).toEqual(deck);
  expect(advanceQuestionDeck(deck, deck.seed, first.ids[2])).toEqual(deck);
  expect(advanceQuestionDeck(deck, "b".repeat(32), first.ids[4])).toEqual(deck);
});

test("bookmark size stays constant as the pool grows", () => {
  const largePool = Array.from({ length: 10000 }, (_, i) => `id-${i}`);
  const small = consume(ids, initial).deck;
  const large = consume(largePool, initial).deck;
  expect(JSON.stringify(large).length).toBe(JSON.stringify(small).length);
  expect(JSON.stringify(large).length).toBeLessThan(250);
});

test.each([null, false, {}, { seed: "broken" }, { ...initial, cursor: 123 }])(
  "discards malformed bookmark %j",
  (value) => {
    expect(parseQuestionDeck(value)).toBeUndefined();
  }
);

test("accepts a valid bookmark and strips unrelated data", () => {
  expect(parseQuestionDeck({ ...initial, extra: "discard" })).toEqual(initial);
});
