import React from "react";
import { User } from "@prisma/client";
import { Link } from "@remix-run/react";
import LogoutButton from "./Logout";
import { useMedia } from "react-use";

type AppBarProps = {
  user: User | undefined;
};
const AppBar: React.FC<AppBarProps> = ({ user }) => {
  const isDownSm = useMedia("(max-width: 480px)");

  return (
    <header className="flex items-center justify-between bg-[#252525] p-3 text-white">
      <h1 className="text-3xl font-bold text-[#1dbab4]">
        <Link to="/.">{isDownSm ? "AMD" : "AskMeDaily"}</Link>
      </h1>
      <div className="flex items-center gap-2">
        {user ? (
          <>
            <Link
              to="/questions"
              className="flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-base font-medium text-[#1dbab4] shadow-sm hover:bg-[#e4f9f8]"
            >
              Questions
            </Link>
            <LogoutButton />
            <div className="relative inline-block flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 align-middle text-white">
              <p className="text-2xl uppercase">{user.email[0]}</p>
            </div>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="flex items-center justify-center rounded-md bg-[#1dbab4] px-4 py-2 font-medium text-white hover:bg-[#138784]"
            >
              Log In
            </Link>
            <Link
              to="/join"
              className="flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-base font-medium text-[#1dbab4] shadow-sm hover:bg-[#e4f9f8] "
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
};

export default AppBar;
