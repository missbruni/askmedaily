import React from "react";
import { Link } from "@remix-run/react";

const Brand: React.FC = () => (
  <Link to="/" className="app-brand" aria-label="AskMeDaily home">
    <span className="app-brand__name">AskMeDaily</span>
    <span className="app-brand__edition">Tabletop Edition</span>
  </Link>
);

export default Brand;
