import React from "react";
import { Form } from "@remix-run/react";
import { UilSignOutAlt } from "@iconscout/react-unicons";

type LogoutButtonProps = {};
const LogoutButton: React.FC<LogoutButtonProps> = (props) => {
  return (
    <Form action="/logout" method="post">
      <button
        type="submit"
        className="header-button header-button--collapse-md"
        aria-label="Log out"
      >
        <UilSignOutAlt size="16" aria-hidden="true" />
        <span className="header-button__label">Log out</span>
      </button>
    </Form>
  );
};
export default LogoutButton;
