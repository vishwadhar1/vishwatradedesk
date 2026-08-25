import Link from "next/link";

export function EmptyState({
  message,
  actionLabel,
  href,
}: {
  message: string;
  actionLabel?: string;
  href?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-muted text-sm">{message}</p>
      {actionLabel && href && (
        <Link
          href={href}
          className="border-accent text-accent hover:bg-accent/10 rounded-sm border px-3 py-1.5 text-xs transition-colors duration-[120ms]"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
