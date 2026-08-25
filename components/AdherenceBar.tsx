export function AdherenceBar({
  followed,
  total,
}: {
  followed: number | null;
  total: number | null;
}) {
  if (followed === null || total === null || total === 0) {
    return <span className="text-muted">—</span>;
  }

  const fraction = followed / total;

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-muted text-xs tabular-nums">
        {followed}/{total}
      </span>
      <div className="bg-border h-1 w-16">
        <div
          className="bg-accent h-full"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </div>
  );
}
