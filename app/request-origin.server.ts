export function hasAllowedOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;

  const url = new URL(request.url);
  const protocol = request.headers.get("X-Forwarded-Proto");
  if (protocol !== null) {
    if (protocol !== "http" && protocol !== "https") return false;
    // Fly terminates TLS before remix-serve constructs the internal HTTP URL.
    url.protocol = `${protocol}:`;
  }

  return origin === url.origin;
}
