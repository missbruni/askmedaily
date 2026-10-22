import { Buffer } from "node:buffer";
import { request } from "node:https";

type PostOptions = {
  headers: Record<string, string>;
  body: string;
  signal: AbortSignal;
};

// Remix 1.x's fetch polyfill can crash the process when aborting a POST body.
export function postJson(url: string, options: PostOptions) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const outgoing = request(
      url,
      {
        method: "POST",
        signal: options.signal,
        headers: {
          ...options.headers,
          "Content-Length": Buffer.byteLength(options.body),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on("error", reject);
        response.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 1024 * 1024) {
            response.destroy(new Error("Provider response is too large."));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          })
        );
      }
    );
    outgoing.on("error", reject);
    outgoing.end(options.body);
  });
}
