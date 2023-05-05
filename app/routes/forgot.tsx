import * as React from "react";
import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { UilInfoCircle } from "@iconscout/react-unicons";

import { validateEmail } from "~/utils";
import { getUserSession } from "~/session.server";
import { sendResetEmail } from "~/auth.server";

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
    <div className="flex min-h-full flex-col justify-center bg-[aliceblue]">
      <div className="max-w-m mx-auto w-[400px] px-8">
        <div className="relative inset-0 bg-white shadow-xl sm:overflow-hidden sm:rounded-2xl">
          <div className="lg:pb-18 flex flex-col items-center justify-center gap-6 px-4 pt-8 pb-8 sm:px-6 sm:pb-12 lg:px-8 lg:pt-32">
            <div className="flex flex-col items-center justify-center gap-6 align-middle">
              <UilInfoCircle className="h-16 w-16 fill-[#1dbab4]" />
              <p className="text-gray-500">
                Enter your email and we will send you a link to reset your
                password.
              </p>
            </div>
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
                {/* TODO: add loading state, submitting */}
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
