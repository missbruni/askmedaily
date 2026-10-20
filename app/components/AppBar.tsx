import React from "react";

import { Link, useLocation } from "@remix-run/react";
import { UilListUl, UilPlay } from "@iconscout/react-unicons";
import Brand from "./Brand";
import LogoutButton from "./Logout";

type AppBarProps = {
  email?: string;
  currentCard?: number;
  totalCards?: number;
};
const AppBar: React.FC<AppBarProps> = ({
  email,
  currentCard = 1,
  totalCards = 0,
}) => {
  const location = useLocation();
  const isQuestionManager = location.pathname.startsWith("/questions");

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Brand />

        {totalCards > 0 && (
          <p className="deck-counter" aria-live="polite">
            <span className="sr-only">{`Card ${currentCard} of ${totalCards}`}</span>
            <span aria-hidden="true">
              <span className="deck-counter__current">{currentCard}</span>
              {" / "}
              <span className="deck-counter__total">{totalCards}</span>
            </span>
          </p>
        )}

        <nav className="app-header__actions" aria-label="Main navigation">
          {email ? (
            <>
              <Link
                to={isQuestionManager ? "/" : "/questions"}
                className="header-button header-button--collapse-sm"
                aria-label={isQuestionManager ? "Play cards" : "Question deck"}
              >
                {isQuestionManager ? (
                  <UilPlay size="16" aria-hidden="true" />
                ) : (
                  <UilListUl size="16" aria-hidden="true" />
                )}
                <span className="header-button__label">
                  {isQuestionManager ? "Play" : "Deck"}
                </span>
              </Link>
              <LogoutButton />
              <span className="app-avatar" title={email}>
                {email[0]?.toUpperCase() ?? "?"}
              </span>
            </>
          ) : (
            <>
              <Link to="/login" className="header-button">
                Log in
              </Link>
              <Link to="/join" className="header-button header-button--primary">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default AppBar;
