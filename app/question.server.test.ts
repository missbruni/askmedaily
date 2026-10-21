import { vi } from "vitest";

import { db } from "~/firebase.server";

import {
  createQuestion,
  getQuestionIds,
  getQuestionsByIds,
} from "./question.server";

vi.mock("~/firebase.server", () => ({
  admin: {
    firestore: { FieldPath: { documentId: vi.fn(() => "document-id") } },
  },
  db: { collection: vi.fn() },
}));

const documentIds = ["q1", "q2", "q3", "q4", "q5", "q6"].map((id) => ({
  id,
}));
const questionDocs = documentIds.map(({ id }) => ({
  id,
  data: () => ({ question: `Question ${id}`, userId: "user-1" }),
}));
const listDocuments = vi.fn();
const queryGet = vi.fn();
const documentSet = vi.fn();
const query = { get: queryGet };
const collection = {
  listDocuments,
  where: vi.fn(() => query),
  doc: vi.fn(() => ({ set: documentSet })),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.collection).mockReturnValue(
    collection as unknown as ReturnType<typeof db.collection>
  );
  listDocuments.mockResolvedValue(documentIds);
  queryGet.mockResolvedValue({
    forEach: (callback: (document: typeof questionDocs[number]) => void) =>
      questionDocs.forEach(callback),
  });
  documentSet.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("caches and invalidates question IDs and handles an empty collection", async () => {
  const now = vi.spyOn(Date, "now").mockReturnValue(1000);

  await getQuestionIds();
  await getQuestionIds();
  const scansBeforeCreate = listDocuments.mock.calls.length;

  now.mockReturnValue(1000 + 5 * 60 * 1000 + 1);
  await getQuestionIds();
  const scansAfterExpiry = listDocuments.mock.calls.length;

  await createQuestion("A new question?", "user-1");
  await getQuestionIds();
  const scansAfterCreate = listDocuments.mock.calls.length;

  await createQuestion("Another question?", "user-1");
  const queryCountBeforeEmpty = collection.where.mock.calls.length;
  listDocuments.mockResolvedValueOnce([]);
  const emptyQuestions = await getQuestionsByIds(await getQuestionIds());

  expect({
    scansBeforeCreate,
    scansAfterExpiry,
    scansAfterCreate,
    emptyQuestions,
    queryCountBeforeEmpty,
    queryCountAfterEmpty: collection.where.mock.calls.length,
  }).toEqual({
    scansBeforeCreate: 1,
    scansAfterExpiry: 2,
    scansAfterCreate: 3,
    emptyQuestions: [],
    queryCountBeforeEmpty: 0,
    queryCountAfterEmpty: 0,
  });
});

test("returns questions in deck order even if Firestore returns a different order", async () => {
  const questions = await getQuestionsByIds(["q3", "deleted", "q1"]);

  expect(questions.map(({ id }) => id)).toEqual(["q3", "q1"]);
  expect(collection.where).toHaveBeenCalledWith("document-id", "in", [
    "q3",
    "deleted",
    "q1",
  ]);
});
