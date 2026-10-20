import React from "react";

import { Link, useLocation } from "@remix-run/react";
import LogoutButton from "./Logout";

type AppBarProps = {
  email?: string;
  currentCard?: number;
  totalCards?: number;
};
const AppBar: React.FC<AppBarProps> = ({
  email,
  currentCard = 1,
  totalCards,
}) => {
  const location = useLocation();
  const isQuestionManager = location.pathname.startsWith("/questions");

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link to="/" className="app-brand" aria-label="AskMeDaily home">
          <span className="app-brand__mark" aria-hidden="true" />
          <span className="app-brand__name">AskMeDaily</span>
          <span className="app-brand__edition">Tabletop Edition</span>
        </Link>

        {totalCards !== undefined && totalCards > 0 && (
          <div
            className="deck-counter"
            aria-label={`Card ${currentCard} of ${totalCards}`}
          >
            <span className="deck-counter__current">
              {String(currentCard).padStart(2, "0")}
            </span>
            <span>of</span>
            <span className="deck-counter__total">
              {String(totalCards).padStart(2, "0")}
            </span>
          </div>
        )}

        <nav className="app-header__actions" aria-label="Main navigation">
          {email ? (
            <>
              <Link
                to={isQuestionManager ? "/" : "/questions"}
                className="app-header__link"
              >
                {isQuestionManager ? "Play cards" : "Questions"}
              </Link>
              <LogoutButton />
              <span className="app-avatar" title={email}>
                {email[0]?.toUpperCase() ?? "?"}
              </span>
            </>
          ) : (
            <>
              <Link to="/login" className="app-header__link">
                Log In
              </Link>
              <Link
                to="/join"
                className="app-header__link app-header__link--primary"
              >
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
