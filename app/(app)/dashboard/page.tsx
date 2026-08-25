import { EmptyState } from "@/components/EmptyState";

export default function DashboardPage() {
  return (
    <EmptyState
      message="No positions yet."
      actionLabel="+ New Position"
      href="/journal/new"
    />
  );
}
