export function Field({
  label,
  htmlFor,
  helper,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-muted text-xs">
        {label}
      </label>
      {children}
      {error ? (
        <span className="text-loss text-xs">{error}</span>
      ) : helper ? (
        <span className="text-muted text-xs">{helper}</span>
      ) : null}
    </div>
  );
}
