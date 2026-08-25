export function GradePill({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-muted">—</span>;

  const letter = grade.charAt(0).toUpperCase();
  const tone =
    letter <= "B"
      ? "border-profit/50 text-profit"
      : letter >= "D"
        ? "border-loss/50 text-loss"
        : "border-muted/50 text-muted";

  return (
    <span
      className={`inline-block rounded-sm border px-1.5 py-0.5 text-xs font-medium ${tone}`}
    >
      {grade}
    </span>
  );
}
