import React from "react";
import { Form } from "@remix-run/react";

type LogoutButtonProps = {};
const LogoutButton: React.FC<LogoutButtonProps> = (props) => {
  return (
    <Form action="/logout" method="post">
      <button
        type="submit"
        className="flex items-center justify-center rounded-md bg-yellow-500 px-4 py-2 font-medium text-white hover:bg-yellow-600"
      >
        Logout
      </button>
    </Form>
  );
};
export default LogoutButton;
