import React from "react";
import type { Question as QuestionModel } from "@prisma/client";

import { formatCardNumber } from "~/utils";

type QuestionProps = {
  question: QuestionModel;
  cardNumber: number;
};

const Question: React.FC<QuestionProps> = ({ question, cardNumber }) => {
  const text = question.question || "No question found.";
  const sizeModifier =
    text.length > 180
      ? " question-card__question--long"
      : text.length > 110
      ? " question-card__question--medium"
      : "";

  return (
    <article className="question-card">
      <header className="question-card__top">
        <span className="question-card__badge">Daily card</span>
        <span className="question-card__number">
          {formatCardNumber(cardNumber)}
        </span>
      </header>

      <div className="question-card__body">
        <h2 className={`question-card__question${sizeModifier}`}>{text}</h2>
        <p className="question-card__prompt">
          There's no right or wrong answer.
        </p>
      </div>

      <footer className="question-card__footer">Tabletop trivia deck</footer>
    </article>
  );
};
export default Question;
