// learn more: https://fly.io/docs/reference/configuration/#services-http_checks
import type { LoaderFunction } from "@remix-run/node";

import { db } from "~/firebase.server";

export const loader: LoaderFunction = async () => {
  try {
    await db.collection("questions").limit(1).get();
    return new Response("OK");
  } catch (error: unknown) {
    console.log("healthcheck ❌", { error });
    return new Response("ERROR", { status: 500 });
  }
};
