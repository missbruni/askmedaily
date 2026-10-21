import { admin, db } from "~/firebase.server";
import { MAX_QUESTION_IMPORT_ROWS } from "~/question-import.server";

const QUESTIONS = "questions";
const QUESTION_IDS_CACHE_TTL_MS = 5 * 60 * 1000;

type QuestionIdsCache = {
  ids: string[];
  expiresAt: number;
};

let questionIdsCache: QuestionIdsCache | undefined;
let questionIdsCacheVersion = 0;
let questionIdsLoad: Promise<string[]> | undefined;

function invalidateQuestionIdsCache() {
  questionIdsCache = undefined;
  questionIdsLoad = undefined;
  questionIdsCacheVersion += 1;
}

export async function getQuestionIds() {
  if (questionIdsCache && questionIdsCache.expiresAt > Date.now()) {
    return questionIdsCache.ids;
  }
  if (questionIdsLoad) return questionIdsLoad;

  const cacheVersion = questionIdsCacheVersion;
  const load = db
    .collection(QUESTIONS)
    .listDocuments()
    .then((documents) => documents.map((document) => document.id));
  questionIdsLoad = load;

  try {
    const ids = await load;
    if (cacheVersion === questionIdsCacheVersion) {
      questionIdsCache = {
        ids,
        expiresAt: Date.now() + QUESTION_IDS_CACHE_TTL_MS,
      };
    }
    return ids;
  } finally {
    if (questionIdsLoad === load) questionIdsLoad = undefined;
  }
}

export type Question = {
  id: string;
  question: string;
  modified: string;
  created: string;
  userId: string;
};

export async function getQuestion(id: string) {
  const snapshot = await db.collection(QUESTIONS).doc(id).get();
  if (!snapshot.exists) throw new Error("Not Found");

  return snapshot.data() as Question;
}

export async function getQuestionsByUser(userId: string) {
  const snapshot = await db
    .collection(QUESTIONS)
    .where("userId", "==", userId)
    .orderBy("modified", "desc")
    .get();

  const data: Question[] = [];
  snapshot.forEach((doc: any) => data.push({ id: doc.id, ...doc.data() }));
  return data;
}

export async function getQuestionsByIds(ids: string[]) {
  if (ids.length === 0) return [];

  const questionsSnapshot = await db
    .collection(QUESTIONS)
    .where(admin.firestore.FieldPath.documentId(), "in", ids)
    .get();

  const data: Question[] = [];
  questionsSnapshot.forEach((doc: any) =>
    data.push({ id: doc.id, ...doc.data() })
  );
  const questions = new Map(data.map((question) => [question.id, question]));
  return ids.flatMap((id) => {
    const question = questions.get(id);
    return question ? [question] : [];
  });
}

export async function createQuestion(question: string, userId: string) {
  const result = await db.collection(QUESTIONS).doc().set({
    userId,
    question,
    created: new Date(),
    modified: new Date(),
  });
  invalidateQuestionIdsCache();
  return result;
}

export async function createQuestions(questions: string[], userId: string) {
  if (questions.length === 0 || questions.length > MAX_QUESTION_IMPORT_ROWS) {
    throw new Error(
      `A batch must contain between 1 and ${MAX_QUESTION_IMPORT_ROWS} questions.`
    );
  }

  const batch = db.batch();
  const now = new Date();
  questions.forEach((question) => {
    batch.set(db.collection(QUESTIONS).doc(), {
      userId,
      question,
      created: now,
      modified: now,
    });
  });

  const result = await batch.commit();
  invalidateQuestionIdsCache();
  return result;
}

export async function updateQuestion(
  id: string,
  question: string,
  userId: string
) {
  const documentRef = db.collection(QUESTIONS).doc(id);
  const isAuthorized = (await documentRef.get()).data()?.userId === userId;

  if (!isAuthorized) throw new Error("Not authorized");

  return documentRef.set({ question, modified: new Date() }, { merge: true });
}

export async function deleteQuestion(id: string, userId: string) {
  const documentRef = db.collection(QUESTIONS).doc(id);
  const isAuthorized = (await documentRef.get()).data()?.userId === userId;

  if (!isAuthorized) throw new Error("Not authorized");

  const result = await documentRef.delete();
  invalidateQuestionIdsCache();
  return result;
}

export async function deleteQuestions(userId: string) {
  const snapshot = await db
    .collection(QUESTIONS)
    .where("userId", "==", userId)
    .get();

  if (snapshot.size === 0) return;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  const result = await batch.commit();
  invalidateQuestionIdsCache();
  return result;
}
