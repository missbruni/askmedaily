import type { Question } from "@prisma/client";
import type { User } from "firebase/auth";

import { prisma } from "~/db.server";

export function getQuestion({
  id,
  userId,
}: Pick<Question, "id"> & {
  userId: User["uid"];
}) {
  return prisma.question.findFirst({
    where: { id, userId },
  });
}

export function getQuestionListItems(userId: string) {
  return prisma.question.findMany({
    where: { userId },
    select: { id: true, question: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getRandomQuestions(ids?: string[]) {
  const count = await prisma.question.count();

  const skip = Math.floor(Math.random() * count);

  const randomQuestions = await prisma.question.findMany({
    ...(ids && { where: { id: { not: { in: ids } } } }),
    take: 5,
    skip,
  });

  return randomQuestions;
}

export function createQuestion({
  question,
  userId,
}: Pick<Question, "question"> & {
  userId: User["uid"];
}) {
  return prisma.question.create({
    data: {
      question,
      userId,
    },
  });
}

export function updateQuestion({
  id,
  question,
  userId,
}: Pick<Question, "question" | "id"> & {
  userId: User["uid"];
}) {
  return prisma.question.update({
    where: {
      id,
    },
    data: {
      question,
      userId,
    },
  });
}

export function deleteQuestion({
  id,
  userId,
}: Pick<Question, "id"> & { userId: User["uid"] }) {
  return prisma.question.deleteMany({
    where: { id, userId },
  });
}

export function deleteQuestions({ userId }: { userId: User["uid"] }) {
  return prisma.question.deleteMany({
    where: { userId },
  });
}
