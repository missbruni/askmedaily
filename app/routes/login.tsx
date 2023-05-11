import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import * as React from "react";
import { signIn } from "~/firebase.server";
import { createUserSession } from "~/session.server";
import { safeRedirect, validateEmail } from "~/utils";

interface ActionData {
  errors?: {
    email?: string;
    password?: string;
  };
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/");

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
    const { user } = await signIn(email, password);
    if (user) {
      const token = await user.getIdToken();
      return createUserSession(token, "/questions");
    }
  } catch (error) {
    return json<ActionData>(
      { errors: { email: "Invalid email or password" } },
      { status: 400 }
    );
  }

  return redirect(redirectTo);
};

export const meta: MetaFunction = () => {
  return {
    title: "Login",
  };
};

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/questions";
  const actionData = useActionData() as ActionData;
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const resetPassword = searchParams.get("reset");

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
        <div className="relative inset-0 rounded-2xl bg-white shadow-xl sm:overflow-hidden">
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
                </div>
                {actionData?.errors?.email && (
                  <div
                    className="mt-2 rounded-md bg-red-100 px-3 py-3 text-sm text-red-500"
                    id="reset-password-error"
                  >
                    {actionData.errors.email}
                  </div>
                )}
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
                    autoComplete="current-password"
                    aria-invalid={
                      actionData?.errors?.password ? true : undefined
                    }
                    aria-describedby="password-error"
                    className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
                  />
                </div>
                {actionData?.errors?.password && (
                  <div
                    className="mt-2 rounded-md bg-red-100 px-3 py-3 text-sm text-red-500"
                    id="reset-password-error"
                  >
                    {actionData.errors.password}
                  </div>
                )}
              </div>

              <input type="hidden" name="redirectTo" value={redirectTo} />
              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-md bg-[#1dbab4] px-4 py-2 font-medium text-white hover:bg-[#138784]"
              >
                Log in
              </button>
              <div className="flex flex-col items-center gap-4">
                {resetPassword === "failed" && (
                  <div
                    className="rounded-md bg-red-100 px-3 py-3 text-sm text-red-500"
                    id="reset-password-error"
                  >
                    Password update could not be processed at this time. Please
                    try again later.
                  </div>
                )}
                {resetPassword === "success" && (
                  <div className="rounded-md bg-green-100 px-3 py-3 text-sm text-gray-500">
                    Password has been updated, you can now login with your new
                    credentials.
                  </div>
                )}
                <div className="text-center text-sm text-gray-500">
                  <Link
                    className="text-blue-500 underline"
                    to={{
                      pathname: "/forgot",
                      search: searchParams.toString(),
                    }}
                  >
                    Forgot password
                  </Link>
                </div>
                <div className="text-center text-sm text-gray-500">
                  Don't have an account?{" "}
                  <Link
                    className="text-blue-500 underline"
                    to={{
                      pathname: "/join",
                      search: searchParams.toString(),
                    }}
                  >
                    Sign up
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
