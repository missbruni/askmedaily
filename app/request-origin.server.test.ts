import { hasAllowedOrigin } from "./request-origin.server";

const cases: [string, string, string, string | undefined, boolean][] = [
  ["local HTTP", "http://app.test/", "http://app.test", undefined, true],
  ["direct HTTPS", "https://app.test/", "https://app.test", undefined, true],
  ["HTTPS behind Fly", "http://app.test/", "https://app.test", "https", true],
  ["forwarded HTTP", "http://app.test/", "http://app.test", "http", true],
  [
    "nonstandard public port",
    "http://app.test:8443/",
    "https://app.test:8443",
    "https",
    true,
  ],
  [
    "unexplained scheme mismatch",
    "http://app.test/",
    "https://app.test",
    undefined,
    false,
  ],
  [
    "insecure origin behind HTTPS proxy",
    "http://app.test/",
    "http://app.test",
    "https",
    false,
  ],
  ["foreign host", "http://app.test/", "http://other.test", undefined, false],
  [
    "foreign host behind HTTPS proxy",
    "http://app.test/",
    "https://other.test",
    "https",
    false,
  ],
  [
    "lookalike host",
    "http://app.test/",
    "https://app.test.other.test",
    "https",
    false,
  ],
  ["foreign port", "http://app.test/", "https://app.test:8443", "https", false],
  ["opaque origin", "http://app.test/", "null", "https", false],
  ["malformed origin", "http://app.test/", "not a URL", "https", false],
  ["unsupported protocol", "http://app.test/", "http://app.test", "ftp", false],
  [
    "malformed protocol",
    "http://app.test/",
    "http://app.test",
    "https:",
    false,
  ],
  [
    "ambiguous protocol list",
    "http://app.test/",
    "http://app.test",
    "https, http",
    false,
  ],
];

test.each(cases)("%s", (_, url, origin, protocol, expected) => {
  const headers = new Headers({ Origin: origin });
  if (protocol !== undefined) headers.set("X-Forwarded-Proto", protocol);
  expect(hasAllowedOrigin(new Request(url, { headers }))).toBe(expected);
});

test("does not trust a forwarded host to permit another site's origin", () => {
  const request = new Request("http://app.test/", {
    headers: {
      Origin: "https://other.test",
      "X-Forwarded-Proto": "https",
      "X-Forwarded-Host": "other.test",
    },
  });
  expect(hasAllowedOrigin(request)).toBe(false);
});

test("keeps existing support for requests without an Origin header", () => {
  expect(hasAllowedOrigin(new Request("http://app.test/"))).toBe(true);
});
