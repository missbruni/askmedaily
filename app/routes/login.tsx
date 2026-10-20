import type { ActionFunction, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import * as React from "react";
import Brand from "~/components/Brand";
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
    <main className="app-shell auth-shell">
      <section className="auth-panel">
        <Brand />
        <h1 className="auth-panel__title">Welcome back</h1>
        <Form method="post" className="auth-form">
          <div className="field">
            <label htmlFor="email" className="field-label">
              Email
            </label>
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
              className="text-field"
            />
            {actionData?.errors?.email && (
              <p className="form-message form-message--error" id="email-error">
                {actionData.errors.email}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <input
              id="password"
              ref={passwordRef}
              name="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={actionData?.errors?.password ? true : undefined}
              aria-describedby="password-error"
              className="text-field"
            />
            {actionData?.errors?.password && (
              <p
                className="form-message form-message--error"
                id="password-error"
              >
                {actionData.errors.password}
              </p>
            )}
          </div>

          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button
            type="submit"
            className="button button--primary button--block"
          >
            Log in
          </button>
          <div className="auth-panel__links">
            {resetPassword === "failed" && (
              <p className="form-message form-message--error">
                Password update could not be processed at this time. Please try
                again later.
              </p>
            )}
            {resetPassword === "success" && (
              <p className="form-message form-message--success">
                Password has been updated, you can now login with your new
                credentials.
              </p>
            )}
            <div>
              <Link
                className="text-link"
                to={{
                  pathname: "/forgot",
                  search: searchParams.toString(),
                }}
              >
                Forgot password
              </Link>
            </div>
            <div>
              Don't have an account?{" "}
              <Link
                className="text-link"
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
      </section>
    </main>
  );
}
