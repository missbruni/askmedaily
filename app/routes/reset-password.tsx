import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useSearchParams,
} from "@remix-run/react";

import * as React from "react";
import { confirmPassword, verifyPasswordCode } from "~/firebase.server";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("oobCode");

  let email = "";
  if (code) {
    //TODO: handle failure
    // add snackbar or message if the code is unverified
    email = await verifyPasswordCode(code);
  }

  if (!email) redirect("/login");

  return json({ data: { email } });
};

interface ActionData {
  data?: string;
  errors?: {
    password?: string;
  };
}

interface LoaderData {
  data?: { email: string };
  error?: string;
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const password = formData.get("password");
  const confirmedPassword = formData.get("confirm-password");

  if (typeof password === "string" && password !== confirmedPassword) {
    return json<ActionData>(
      { errors: { password: "Passwords do not match." } },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("oobCode");

  if (typeof password === "string" && code) {
    try {
      await confirmPassword(code, password);
      return redirect("/login?reset=success");
    } catch {}
  }

  return redirect("/login?reset=failed");
};

export const meta: MetaFunction = () => {
  return {
    title: "ResetPassword",
  };
};

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const loaderData = useLoaderData() as LoaderData;
  const actionData = useActionData() as ActionData;

  const passwordRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (actionData?.errors?.password) {
      passwordRef.current?.focus();
    }
  }, [actionData]);

  React.useEffect(() => {
    if (loaderData?.error) {
      redirect("/login");
    }
  }, [loaderData]);

  return (
    <main className="app-shell auth-shell">
      <section className="auth-panel">
        <p className="auth-panel__eyebrow">AskMeDaily / Tabletop Edition</p>
        <h1 className="auth-panel__title">Choose a new password</h1>
        <p className="auth-panel__description">
          {`Set a new password for ${loaderData.data!.email}`}
        </p>
        <Form method="post" className="auth-form">
          <div>
            <label htmlFor="password" className="auth-label">
              Password
            </label>
            <input
              ref={passwordRef}
              id="password"
              required
              autoFocus={true}
              name="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={actionData?.errors?.password ? true : undefined}
              aria-describedby="password-error"
              className="auth-input"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="auth-label">
              Confirm password
            </label>
            <input
              id="confirm-password"
              required
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={actionData?.errors?.password ? true : undefined}
              aria-describedby="password-error"
              className="auth-input"
            />
            {actionData?.errors?.password && (
              <p
                className="auth-message auth-message--error"
                id="password-error"
              >
                {actionData.errors.password}
              </p>
            )}
          </div>
          {Boolean(actionData?.data) && (
            <p className="auth-message auth-message--success">
              {actionData.data}
            </p>
          )}
          <button type="submit" className="auth-submit">
            Save password
          </button>
          <div className="auth-panel__links">
            <span>Need an account? </span>
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
        </Form>
      </section>
    </main>
  );
}
