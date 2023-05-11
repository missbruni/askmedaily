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
    <div className="flex min-h-full flex-col justify-center bg-[aliceblue]">
      <div className="max-w-m mx-auto w-[400px] px-8">
        <div className="relative inset-0 bg-white shadow-xl sm:overflow-hidden sm:rounded-2xl">
          <div className="lg:pb-18 flex flex-col items-center justify-center gap-6 px-4 pt-8 pb-8 sm:px-6 sm:pb-12 lg:px-8 lg:pt-32">
            <div className="flex flex-col items-center justify-center gap-6 align-middle">
              <p className="text-gray-500">
                {/* TODO: handle this more gracefully */}
                {`Enter your new password for account ${
                  loaderData.data!.email
                }`}
              </p>
            </div>
            <Form method="post" className="w-full space-y-6">
              <div>
                <label
                  htmlFor="password"
                  className="text-md block font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="mt-1">
                  <input
                    ref={passwordRef}
                    id="password"
                    required
                    autoFocus={true}
                    name="password"
                    type="password"
                    autoComplete="password"
                    aria-invalid={
                      actionData?.errors?.password ? true : undefined
                    }
                    aria-describedby="password-error"
                    className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="text-md block font-medium text-gray-700"
                >
                  Confirm Password
                </label>
                <div className="mt-1">
                  <input
                    id="confirm-password"
                    required
                    autoFocus={true}
                    name="confirm-password"
                    type="password"
                    autoComplete="confirm-password"
                    aria-invalid={
                      actionData?.errors?.password ? true : undefined
                    }
                    aria-describedby="password-error"
                    className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
                  />
                </div>
              </div>
              {Boolean(actionData?.data) && (
                <div className="rounded-md bg-gray-100 px-3 py-3 text-sm text-gray-500">
                  {actionData.data}
                </div>
              )}
              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-md bg-[#1dbab4] px-4 py-2 font-medium text-white hover:bg-[#138784]"
              >
                Submit
              </button>

              <div className="flex flex-col items-center">
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
