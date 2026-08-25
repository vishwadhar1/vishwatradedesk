const FRESH_MINUTES = 15;
const STALE_MINUTES = 60;

export function StalenessDot({
  timestamp,
}: {
  timestamp: string | Date | null;
}) {
  if (!timestamp) {
    return (
      <span
        className="bg-muted inline-block h-1.5 w-1.5 rounded-full"
        aria-label="No price data"
      />
    );
  }

  const ageMinutes = (Date.now() - new Date(timestamp).getTime()) / 60_000;
  const color =
    ageMinutes < FRESH_MINUTES
      ? "bg-profit"
      : ageMinutes < STALE_MINUTES
        ? "bg-warn"
        : "bg-muted";
  const label =
    ageMinutes < FRESH_MINUTES
      ? "Price is fresh"
      : ageMinutes < STALE_MINUTES
        ? "Price is stale"
        : "Price is very stale";

  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${color}`}
      aria-label={label}
    />
  );
}
