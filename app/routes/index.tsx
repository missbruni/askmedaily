import { Link } from "@remix-run/react";
import LogoutButton from "~/components/Logout";

import { useOptionalUser } from "~/utils";

export default function Index() {
  const user = useOptionalUser();

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header>
        <nav>
          <ul className="flex items-center justify-end gap-4 bg-gray-900 p-4 text-yellow-500">
            {user ? (
              <>
                <li>
                  <LogoutButton />
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link
                    to="/login"
                    className="flex items-center justify-center rounded-md bg-yellow-500 px-4 py-2 font-medium text-white hover:bg-yellow-600"
                  >
                    Log In
                  </Link>
                </li>
                <li>
                  <Link
                    to="/join"
                    className="flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-base font-medium text-yellow-700 shadow-sm hover:bg-yellow-50 "
                  >
                    Sign up
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </header>
      <main>
        {/* <main className="relative min-h-screen bg-white sm:flex sm:items-center sm:justify-center"> */}
        <div className="relative sm:pb-16 sm:pt-8">
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="relative shadow-xl sm:overflow-hidden sm:rounded-2xl">
              <div className="absolute inset-0 bg-gray-900">
                <div className="absolute inset-0 bg-[color:rgba(254,204,27,0.5)] mix-blend-multiply" />
              </div>
              <div className="lg:pb-18 relative px-4 pt-16 pb-8 sm:px-6 sm:pt-24 sm:pb-14 lg:px-8 lg:pt-32">
                <h1 className="text-center text-6xl font-extrabold tracking-tight sm:text-5xl lg:text-7xl">
                  <span className="block uppercase text-yellow-500 drop-shadow-md">
                    Daily Question
                  </span>
                </h1>
                <div className="mx-auto mt-10 max-w-sm text-white sm:flex sm:max-w-none sm:justify-center">
                  a question here...
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
