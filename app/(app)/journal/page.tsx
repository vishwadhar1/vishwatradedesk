import { EmptyState } from "@/components/EmptyState";

export default function JournalPage() {
  return (
    <EmptyState
      message="No positions in your journal yet."
      actionLabel="+ New Position"
      href="/journal/new"
    />
  );
}
