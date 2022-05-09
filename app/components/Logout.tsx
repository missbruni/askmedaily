import React from "react";
import { Form } from "@remix-run/react";

type LogoutButtonProps = {};
const LogoutButton: React.FC<LogoutButtonProps> = (props) => {
  return (
    <Form action="/logout" method="post">
      <button
        type="submit"
        className="flex items-center justify-center rounded-md bg-[#1dbab4] px-4 py-2 font-medium text-white hover:bg-[#138784]"
      >
        Logout
      </button>
    </Form>
  );
};
export default LogoutButton;
