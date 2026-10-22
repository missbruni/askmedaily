import { Buffer } from "node:buffer";
import { createServer } from "node:http";
import type * as Http from "node:http";
import type { AddressInfo, Socket } from "node:net";
import { vi } from "vitest";

import { postJson } from "./post-json.server";

// Exercise real sockets without TLS fixtures or outbound provider requests.
vi.mock("node:https", async () => ({
  request: (await vi.importActual<typeof Http>("node:http")).request,
}));

const handler = vi.fn<[Http.IncomingMessage, Http.ServerResponse], void>();
const sockets = new Set<Socket>();
let server: Http.Server;
let url: string;

beforeEach(async () => {
  handler.mockReset().mockImplementation((request, response) => {
    request.resume();
    response.end("{}");
  });
  server = createServer(handler);
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
});

afterEach(async () => {
  vi.restoreAllMocks();
  sockets.forEach((socket) => socket.destroy());
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function options(controller = new AbortController()) {
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: "caf\u00e9" }),
    signal: controller.signal,
  };
}

test("posts UTF-8 JSON and returns status and body without using global fetch", async () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  let received = "";
  let incoming!: Http.IncomingMessage;
  handler.mockImplementation((request, response) => {
    incoming = request;
    request.setEncoding("utf8");
    request.on("data", (chunk) => (received += chunk));
    request.on("end", () => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end('{"questions":["A question?"]}');
    });
  });
  expect(await postJson(url, options())).toEqual({
    status: 200,
    body: '{"questions":["A question?"]}',
  });
  expect(incoming.method).toBe("POST");
  expect(incoming.headers["content-type"]).toBe("application/json");
  expect(Number(incoming.headers["content-length"])).toBe(
    Buffer.byteLength(received)
  );
  expect(JSON.parse(received)).toEqual({ topic: "caf\u00e9" });
  expect(fetch).not.toHaveBeenCalled();
});

test("aborts a fully sent POST under Remix globals without an unhandled rejection", async () => {
  let sent!: () => void;
  const ready = new Promise<void>((resolve) => {
    sent = resolve;
  });
  handler.mockImplementation((request) => {
    request.resume();
    request.on("end", sent);
  });
  const controller = new AbortController();
  const pending = postJson(url, options(controller));
  const failure = pending.catch((error: unknown) => error);
  await ready;
  controller.abort();
  expect(await failure).toMatchObject({ name: "AbortError" });

  handler.mockImplementation((request, response) => {
    request.resume();
    response.end("{}");
  });
  expect((await postJson(url, options())).status).toBe(200);
});

test("aborts when the provider starts a response but never finishes it", async () => {
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  handler.mockImplementation((request, response) => {
    request.resume();
    response.writeHead(200, { "Content-Type": "application/json" });
    response.write('{"questions":[', started);
  });
  const controller = new AbortController();
  const pending = postJson(url, options(controller));
  const failure = pending.catch((error: unknown) => error);
  await ready;
  controller.abort();
  expect(await failure).toMatchObject({ name: "AbortError" });
});

test("rejects an already aborted request without contacting the server", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(postJson(url, options(controller))).rejects.toMatchObject({
    name: "AbortError",
  });
  expect(handler).not.toHaveBeenCalled();
});

test("returns provider errors for the caller to handle", async () => {
  handler.mockImplementation((request, response) => {
    request.resume();
    response.writeHead(429);
    response.end("Rate limited");
  });
  expect(await postJson(url, options())).toEqual({
    status: 429,
    body: "Rate limited",
  });
});

test("rejects oversized responses instead of buffering them indefinitely", async () => {
  handler.mockImplementation((request, response) => {
    request.resume();
    response.end("x".repeat(1024 * 1024 + 1));
  });
  await expect(postJson(url, options())).rejects.toThrow(
    "Provider response is too large."
  );
});
