import React from "react";
import { Question, User } from "@prisma/client";

import RevealButton from "./RevealButton";
import { capitalizeFirstLetter } from "~/utils";

type QuestionProps = {
  question: Question & { user: User };
};

const GIF_URL =
  "https://www.icegif.com/wp-content/uploads/maradona-icegif-5.gif";

const Question: React.FC<QuestionProps> = ({ question }) => {
  const gifRef = React.useRef(null);

  React.useEffect(() => {
    const continuosGif = setInterval(() => {
      if (gifRef.current) {
        (
          gifRef.current as HTMLImageElement
        ).src = `${GIF_URL}?a=${Math.random()}`;
      }
    }, 3000);

    return () => clearInterval(continuosGif);
  }, []);

  return (
    <div className="lg:pb-18 flex h-full w-full flex-col items-center justify-center gap-20 px-4 pt-16 pb-8 sm:px-6 sm:pb-14 lg:px-8 lg:pt-32">
      <h6 className="text-center text-2xl font-extrabold tracking-tight">
        <span className="block text-[#1dbab4] drop-shadow-md">Question</span>
      </h6>
      <h3 className="text-center text-3xl font-extrabold tracking-tight sm:text-3xl lg:text-5xl">
        <span className="block text-white drop-shadow-md">
          {question.question || "No question found."}
        </span>
      </h3>
      <div>
        <RevealButton
          label="Reveal Author"
          image={
            <img
              alt="monkey-gif"
              src="https://www.icegif.com/wp-content/uploads/maradona-icegif-5.gif"
              width="180px"
              ref={gifRef}
            />
          }
        >
          <span className="text-white">
            {capitalizeFirstLetter(question.user.email.split("@")[0])}
          </span>
        </RevealButton>
      </div>
    </div>
  );
};
export default Question;
