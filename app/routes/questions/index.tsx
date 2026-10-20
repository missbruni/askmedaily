import { Link } from "@remix-run/react";

export default function QuestionsIndexPage() {
  return (
    <div className="deck-manager__empty">
      <p className="deck-manager__eyebrow">Ready for the next card?</p>
      <h2 className="deck-manager__editor-title">Select a question</h2>
      <p>Choose a card from your deck or create a new question.</p>
      <Link to="new" className="button button--primary">
        + New Question
      </Link>
    </div>
  );
}
