import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return {
    title: "Maintenance",
  };
};

export default function Maintenance() {
  return (
    <main className="app-shell maintenance-shell">
      <section className="maintenance-panel">
        <p className="deck-manager__eyebrow">AskMeDaily / Tabletop Edition</p>
        <h1 className="deck-manager__title">The table is being set.</h1>
        <p className="deck-manager__summary">We will be back shortly.</p>
        <img
          className="maintenance-panel__image"
          alt="A person working at a computer"
          title="Maintenance"
          src="/images/coding.gif"
          width="300"
        />
      </section>
    </main>
  );
}
