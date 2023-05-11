import { admin, db } from "~/firebase.server";

const QUESTIONS = "questions";

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

export async function getRandomQuestions(ignoredIds?: string[]) {
  const documentIds: string[] = [];
  const documentsSnapshot = await db.collection(QUESTIONS).listDocuments();
  documentsSnapshot.forEach((doc: any) => {
    if (!ignoredIds || !ignoredIds?.includes(doc.id)) documentIds.push(doc.id);
  });

  const shuffled = documentIds.sort(() => 0.5 - Math.random());
  const randomDocumentIds = shuffled.slice(0, 5);

  const questionsSnapshot = await db
    .collection(QUESTIONS)
    .where(admin.firestore.FieldPath.documentId(), "in", randomDocumentIds)
    .get();

  const data: Question[] = [];
  questionsSnapshot.forEach((doc: any) =>
    data.push({ id: doc.id, ...doc.data() })
  );
  return data;
}

export async function createQuestion(question: string, userId: string) {
  return db.collection(QUESTIONS).doc().set({
    userId,
    question,
    created: new Date(),
    modified: new Date(),
  });
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

  return db.collection(QUESTIONS).doc(id).delete();
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

  return batch.commit();
}
