import React from "react";
import { Question as QuestionModel } from "@prisma/client";

type QuestionProps = {
  question: QuestionModel;
};

const Question: React.FC<QuestionProps> = ({ question }) => {
  return (
    <div className="lg:pb-18 flex h-full w-full flex-col items-center justify-center gap-20 px-4 pt-16 pb-8 sm:px-6 sm:pb-14 lg:px-8">
      <h6 className="text-center text-2xl font-extrabold tracking-tight">
        <span className="block text-[#1dbab4] drop-shadow-md">Question</span>
      </h6>
      <h3 className="text-center text-2xl  font-extrabold tracking-tight xl:text-3xl">
        <span className="block text-white drop-shadow-md">
          {question.question || "No question found."}
        </span>
      </h3>
    </div>
  );
};
export default Question;
