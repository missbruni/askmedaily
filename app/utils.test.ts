import { confirmBeforeSubmit, formatCardNumber, validateEmail } from "./utils";

test("validateEmail returns false for non-emails", () => {
  expect(validateEmail(undefined)).toBe(false);
  expect(validateEmail(null)).toBe(false);
  expect(validateEmail("")).toBe(false);
  expect(validateEmail("not-an-email")).toBe(false);
  expect(validateEmail("n@")).toBe(false);
});

test("validateEmail returns true for emails", () => {
  expect(validateEmail("kody@example.com")).toBe(true);
});

test("formatCardNumber pads single digits", () => {
  expect(formatCardNumber(1)).toBe("#01");
  expect(formatCardNumber(12)).toBe("#12");
  expect(formatCardNumber(120)).toBe("#120");
});

test("confirmBeforeSubmit only cancels the event when the user declines", () => {
  const originalConfirm = window.confirm;
  const confirm = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
  const event = { preventDefault: vi.fn() };
  window.confirm = confirm;

  try {
    confirmBeforeSubmit("Delete?")(event);
    expect(event.preventDefault).not.toHaveBeenCalled();

    confirmBeforeSubmit("Delete?")(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenLastCalledWith("Delete?");
  } finally {
    window.confirm = originalConfirm;
  }
});
