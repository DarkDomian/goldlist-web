export function SplashScreen({ message = "Opening your notebook…" }: { message?: string }) {
  return (
    <div className="splash" role="status" aria-live="polite">
      <div className="splash__mark" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
