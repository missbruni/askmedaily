import { installGlobals } from "@remix-run/node";
import "@testing-library/jest-dom/extend-expect";

process.env.SESSION_SECRET = "question-deck-test-secret";

installGlobals();
