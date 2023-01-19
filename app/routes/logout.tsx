import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { logout } from "~/auth.server";

export const action: ActionFunction = async () => {
  await logout();
  return null;
};

export const loader: LoaderFunction = async () => {
  return redirect("/");
};
