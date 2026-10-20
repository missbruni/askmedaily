import React from "react";
import { Form } from "@remix-run/react";

type LogoutButtonProps = {};
const LogoutButton: React.FC<LogoutButtonProps> = (props) => {
  return (
    <Form action="/logout" method="post">
      <button type="submit" className="app-header__button">
        Log out
      </button>
    </Form>
  );
};
export default LogoutButton;
