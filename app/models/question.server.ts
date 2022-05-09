import type { User, Question } from "@prisma/client";

import { prisma } from "~/db.server";

export type { Question } from "@prisma/client";

export function getQuestion({
  id,
  userId,
}: Pick<Question, "id"> & {
  userId: User["id"];
}) {
  return prisma.question.findFirst({
    where: { id, userId },
  });
}

export function getQuestionListItems({ userId }: { userId: User["id"] }) {
  return prisma.question.findMany({
    where: { userId },
    select: { id: true, question: true },
    orderBy: { updatedAt: "desc" },
  });
}

export function createQuestion({
  question,
  userId,
}: Pick<Question, "question"> & {
  userId: User["id"];
}) {
  return prisma.question.create({
    data: {
      question,
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });
}

export function updateQuestion({
  id,
  question,
  userId,
}: Pick<Question, "question" | "id"> & {
  userId: User["id"];
}) {
  return prisma.question.update({
    where: {
      id,
    },
    data: {
      question,
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });
}

export function deleteQuestion({
  id,
  userId,
}: Pick<Question, "id"> & { userId: User["id"] }) {
  return prisma.question.deleteMany({
    where: { id, userId },
  });
}
