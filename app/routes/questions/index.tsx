import { Link } from "@remix-run/react";
import { UilPlus } from "@iconscout/react-unicons";

export default function QuestionsIndexPage() {
  return (
    <div className="deck-manager__empty">
      <p className="eyebrow">Ready for the next card?</p>
      <h2 className="deck-manager__detail-title">Select a question</h2>
      <p>Choose a card from your deck to edit it, or add a new one.</p>
      <Link to="new" className="button button--primary">
        <UilPlus size="16" aria-hidden="true" />
        New Question
      </Link>
    </div>
  );
}
