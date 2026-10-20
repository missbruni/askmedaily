import React from "react";
import type { Question as QuestionModel } from "@prisma/client";

type QuestionProps = {
  question: QuestionModel;
  cardNumber: number;
};

const Question: React.FC<QuestionProps> = ({ question, cardNumber }) => {
  return (
    <article className="question-card">
      <header className="question-card__top">
        <span className="question-card__badge">
          <span className="question-card__badge-dot" aria-hidden="true" />
          Daily card
        </span>
        <span className="question-card__number">
          #{String(cardNumber).padStart(2, "0")}
        </span>
      </header>

      <div className="question-card__body">
        <p className="question-card__eyebrow">A question to share</p>
        <h2 className="question-card__question">
          {question.question || "No question found."}
        </h2>
        <p className="question-card__prompt">
          Take a moment. There is no right answer.
        </p>
      </div>

      <footer className="question-card__footer">Tabletop trivia deck</footer>
    </article>
  );
};
export default Question;
