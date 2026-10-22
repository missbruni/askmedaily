import { createHash } from "node:crypto";

import { db } from "~/firebase.server";

export class QuestionGenerationError extends Error {
  constructor(
    message: string,
    public status = 502,
    public retryAfter?: number
  ) {
    super(message);
  }
}

export async function reserveQuestionGeneration(userId: string) {
  const dailyLimit = Number(process.env.GEMINI_DAILY_REQUEST_LIMIT ?? "20");
  if (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 1000) {
    throw new QuestionGenerationError(
      "AI generation is not configured correctly. Please contact the site owner.",
      503
    );
  }
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  const untilTomorrow = Math.ceil(
    (Date.parse(`${day}T00:00:00Z`) + 86400000 - now) / 1000
  );
  const limits = db.collection("questionGenerationLimits");
  const userKey = createHash("sha256").update(userId).digest("hex");
  const userRef = limits.doc(`user-${userKey}`);
  const globalRef = limits.doc("global");

  await db.runTransaction(async (transaction) => {
    const [userSnapshot, globalSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(globalRef),
    ]);
    const user = userSnapshot.data();
    const global = globalSnapshot.data();
    const userCount = user?.day === day ? user.count : 0;
    const globalCount = global?.day === day ? global.count : 0;
    if (userCount >= 5 || globalCount >= dailyLimit) {
      throw new QuestionGenerationError(
        "Today's AI generation limit has been reached. Please try again tomorrow.",
        429,
        untilTomorrow
      );
    }
    if (user?.lastRequestedAt && now - user.lastRequestedAt < 60000) {
      throw new QuestionGenerationError(
        "Please wait a minute between generation requests.",
        429,
        Math.ceil((60000 - (now - user.lastRequestedAt)) / 1000)
      );
    }
    // Reserve before calling Gemini; concurrent requests share the same budget.
    transaction.set(userRef, {
      day,
      count: userCount + 1,
      lastRequestedAt: now,
    });
    transaction.set(globalRef, { day, count: globalCount + 1 });
  });
}
