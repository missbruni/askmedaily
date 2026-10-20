import * as React from "react";
import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { UilInfoCircle } from "@iconscout/react-unicons";

import Brand from "~/components/Brand";
import { validateEmail } from "~/utils";
import { getUserSession } from "~/session.server";
import { sendResetEmail } from "~/firebase.server";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserSession(request);
  if (user) return redirect("/");
  return json({});
};

interface ActionData {
  data?: string;
  errors?: {
    email?: string;
  };
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email");

  if (!validateEmail(email)) {
    return json<ActionData>(
      { errors: { email: "Email is invalid" } },
      { status: 400 }
    );
  }

  await sendResetEmail(email);
  return json<ActionData>({
    data: "A reset password link will be sent if this account is recognized.",
  });
};

export const meta: MetaFunction = () => {
  return {
    title: "Forgot",
  };
};

export default function ForgotPage() {
  const [searchParams] = useSearchParams();
  const actionData = useActionData() as ActionData;

  const emailRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (actionData?.errors?.email) {
      emailRef.current?.focus();
    }
  }, [actionData]);

  return (
    <main className="app-shell auth-shell">
      <section className="auth-panel">
        <Brand />
        <UilInfoCircle className="auth-panel__icon" aria-hidden="true" />
        <h1 className="auth-panel__title">Reset your password</h1>
        <p className="auth-panel__description">
          Enter your email and we will send a link to reset your password.
        </p>
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
          {Boolean(actionData?.data) && (
            <p className="form-message form-message--success">
              {actionData.data}
            </p>
          )}
          <button
            type="submit"
            className="button button--primary button--block"
          >
            {/* TODO: add loading state, submitting */}
            Send reset link
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
