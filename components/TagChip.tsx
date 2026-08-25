export function TagChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove?: () => void;
}) {
  return (
    <span className="border-border bg-surface text-muted inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs">
      #{label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${label}`}
          className="text-muted hover:text-text"
        >
          ×
        </button>
      )}
    </span>
  );
}
