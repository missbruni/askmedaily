import * as React from "react";

import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";

import Brand from "~/components/Brand";
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
    <main className="app-shell auth-shell">
      <section className="auth-panel">
        <Brand />
        <h1 className="auth-panel__title">Join the table</h1>
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
              autoComplete="new-password"
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
            Create Account
          </button>
          <div className="auth-panel__links">
            <span>Already have an account? </span>
            <Link
              className="text-link"
              to={{
                pathname: "/login",
                search: searchParams.toString(),
              }}
            >
              Log in
            </Link>
          </div>
        </Form>
      </section>
    </main>
  );
}
