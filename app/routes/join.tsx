import * as React from "react";

import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";

import { createUserSession, getUserSession } from "~/session.server";
import { validateEmail } from "~/utils";
import { signUp } from "~/firebase.server";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserSession(request);
  if (user) return redirect("/");
  return json({});
};

interface ActionData {
  errors: {
    email?: string;
    password?: string;
  };
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  if (!validateEmail(email)) {
    return json<ActionData>(
      { errors: { email: "Email is invalid" } },
      { status: 400 }
    );
  }

  if (typeof password !== "string") {
    return json<ActionData>(
      { errors: { password: "Password is required" } },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return json<ActionData>(
      { errors: { password: "Password is too short" } },
      { status: 400 }
    );
  }

  try {
    const { user } = await signUp(email, password);
    if (user) {
      const token = await user.getIdToken();
      return createUserSession(token, "/questions");
    }
  } catch (error: any) {
    let errorMessage;
    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage = `Email address ${email} already in use.`;
        break;
      case "auth/invalid-email":
        errorMessage = `Email address ${email} is invalid.`;
        break;
      case "auth/operation-not-allowed":
        errorMessage = `Error during sign up.`;
        break;
      case "auth/weak-password":
        errorMessage =
          "Password is not strong enough. Add additional characters including special characters and numbers.";
        break;
      default:
        errorMessage = error.message;
        break;
    }

    return json<ActionData>(
      { errors: { email: errorMessage } },
      { status: 500 }
    );
  }
};

export const meta: MetaFunction = () => {
  return {
    title: "Sign Up",
  };
};

export default function Join() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? undefined;
  const actionData = useActionData() as ActionData;
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (actionData?.errors?.email) {
      emailRef.current?.focus();
    } else if (actionData?.errors?.password) {
      passwordRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="flex min-h-full flex-col justify-center bg-[aliceblue]">
      <div className="max-w-m mx-auto w-[400px] px-8">
        <div className="relative inset-0 bg-white shadow-xl sm:overflow-hidden sm:rounded-2xl">
          <div className="lg:pb-18 flex flex-col items-center justify-center px-4 pt-8 pb-8 sm:px-6 sm:pb-12 lg:px-8">
            <Form method="post" className="w-full space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="text-md block font-medium text-gray-700"
                >
                  Email
                </label>
                <div className="mt-1">
                  <input
                    ref={emailRef}
                    id="email"
                    required
                    autoFocus={true}
                    name="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={actionData?.errors?.email ? true : undefined}
                    aria-describedby="email-error"
                    className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
                  />
                  {actionData?.errors?.email && (
                    <div className="pt-1 text-red-700" id="email-error">
                      {actionData.errors.email}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="text-md block font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    ref={passwordRef}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={
                      actionData?.errors?.password ? true : undefined
                    }
                    aria-describedby="password-error"
                    className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
                  />
                  {actionData?.errors?.password && (
                    <div className="pt-1 text-red-700" id="password-error">
                      {actionData.errors.password}
                    </div>
                  )}
                </div>
              </div>

              <input type="hidden" name="redirectTo" value={redirectTo} />
              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-md bg-[#1dbab4] px-4 py-2 font-medium text-white hover:bg-[#138784]"
              >
                Create Account
              </button>
              <div className="flex items-center justify-center">
                <div className="text-center text-sm text-gray-500">
                  Already have an account?{" "}
                  <Link
                    className="text-blue-500 underline"
                    to={{
                      pathname: "/login",
                      search: searchParams.toString(),
                    }}
                  >
                    Log in
                  </Link>
                </div>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
