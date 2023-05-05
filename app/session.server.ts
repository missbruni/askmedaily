import { createCookieSessionStorage, redirect } from "@remix-run/node";
import invariant from "tiny-invariant";

import { adminAuth, getSessionToken, logoutFirebase } from "./auth.server";

invariant(process.env.SESSION_SECRET, "SESSION_SECRET must be set");

export const storage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    // normally you want this to be `secure: true`
    // but that doesn't work on localhost for Safari
    // https://web.dev/when-to-use-local-https/
    secure: process.env.NODE_ENV === "production",
    secrets: [process.env.SESSION_SECRET],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

// export async function getSession(request: Request) {
//   const cookie = request.headers.get("Cookie");
//   return storage.getSession(cookie);
// }

// export async function getUserId(
//   request: Request
// ): Promise<User["id"] | undefined> {
//   const session = await getSession(request);
//   const userId = session.get(USER_SESSION_KEY);
//   return userId;
// }

// export async function getUser(request: Request) {
//   const userId = await getUserId(request);
//   if (userId === undefined) return null;

//   const user = await getUserById(userId);
//   if (user) return user;

//   throw await logout(request);
// }

// export async function requireUserId(
//   request: Request,
//   redirectTo: string = new URL(request.url).pathname
// ) {
//   const userId = await getUserId(request);
//   if (!userId) {
//     const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
//     throw redirect(`/login?${searchParams}`);
//   }
//   return userId;
// }

// export async function requireUser(request: Request) {
//   const userId = await requireUserId(request);

//   const user = await getUserById(userId);
//   if (user) return user;

//   throw await logout(request);
// }

async function destroySession(request: Request) {
  const session = await storage.getSession(request.headers.get("Cookie"));
  const newCookie = await storage.destroySession(session);

  return redirect("/", { headers: { "Set-Cookie": newCookie } });
}

export async function getUserSession(request: Request) {
  const cookieSession = await storage.getSession(request.headers.get("Cookie"));
  const token = cookieSession.get("token");
  if (!token) return null;

  try {
    const tokenUser = await adminAuth.verifySessionCookie(token, true);
    return tokenUser;
  } catch (error) {
    return null;
  }
}

export async function createUserSession(idToken: string, redirectTo: string) {
  const token = await getSessionToken(idToken);
  const session = await storage.getSession();

  session.set("token", token);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}

export async function logout(request: Request) {
  await logoutFirebase();
  return await destroySession(request);
}
