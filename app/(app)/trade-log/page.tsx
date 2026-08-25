import { EmptyState } from "@/components/EmptyState";

export default function TradeLogPage() {
  return (
    <EmptyState
      message="No closed trades yet."
      actionLabel="+ New Position"
      href="/journal/new"
    />
  );
}
