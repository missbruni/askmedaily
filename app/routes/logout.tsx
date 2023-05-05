import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { logout } from "~/session.server";

export const loader: LoaderFunction = async () => {
  return redirect("/login");
};

export const action: ActionFunction = async ({ request }) => {
  return logout(request);
};
