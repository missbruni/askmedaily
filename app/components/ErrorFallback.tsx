export default function ErrorFallback({ error }: { error: Error }) {
  return (
    <div role="alert">
      <p>Something went wrong. Try again later.</p>
      <pre style={{ color: "red" }}>{error.message}</pre>
    </div>
  );
}
