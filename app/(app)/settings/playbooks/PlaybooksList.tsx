"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Section } from "@/components/Section";
import { archivePlaybook } from "../actions";

type PlaybookRow = {
  id: string;
  name: string;
  description: string;
  rules: { id: string; text: string }[];
  isArchived: boolean;
  positionCount: number;
};

export function PlaybooksList({ playbooks }: { playbooks: PlaybookRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const columns: DataTableColumn<PlaybookRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (p) => (
        <Link
          href={`/settings/playbooks/${p.id}`}
          className="text-text hover:text-accent"
        >
          {p.name}
        </Link>
      ),
    },
    {
      key: "rules",
      header: "Rules",
      numeric: true,
      sortable: true,
      sortAccessor: (p) => p.rules.length,
      render: (p) => p.rules.length,
    },
    {
      key: "positions",
      header: "Positions",
      numeric: true,
      sortable: true,
      sortAccessor: (p) => p.positionCount,
      render: (p) => p.positionCount,
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <span
          className={
            p.isArchived ? "text-muted text-xs" : "text-profit text-xs"
          }
        >
          {p.isArchived ? "Archived" : "Active"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (p) =>
        !p.isArchived && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await archivePlaybook(p.id);
                router.refresh();
              })
            }
            className="text-muted hover:text-loss text-xs disabled:opacity-50"
          >
            Archive
          </button>
        ),
    },
  ];

  return (
    <Section id="playbooks" title="Playbooks">
      <div className="mb-3">
        <Link
          href="/settings/playbooks/new"
          className="bg-accent text-text hover:bg-accent/90 inline-block rounded-sm px-3 py-1.5 text-xs font-medium transition-colors duration-[120ms]"
        >
          + New Playbook
        </Link>
      </div>
      <DataTable columns={columns} rows={playbooks} rowKey={(p) => p.id} />
    </Section>
  );
}
