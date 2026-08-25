"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Field } from "@/components/Field";
import { Section } from "@/components/Section";
import type { ManagedListItem } from "@/db/schema";
import {
  addSetup,
  addStrategy,
  archiveSetup,
  archiveStrategy,
  renameSetup,
  renameStrategy,
} from "../actions";

// No width utility here on purpose — every call site sets its own (w-full,
// w-40, ...), and stacking two width classes in one string is a silent
// cascade-order bug, not a merge, since these are plain string classNames.
const inputClass =
  "border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-accent disabled:opacity-50";

export function ManagedLists({
  strategies,
  setups,
}: {
  strategies: ManagedListItem[];
  setups: ManagedListItem[];
}) {
  return (
    <>
      <ManagedListSection
        id="strategies"
        title="Strategies"
        items={strategies}
        addAction={addStrategy}
        renameAction={renameStrategy}
        archiveAction={archiveStrategy}
      />
      <ManagedListSection
        id="setups"
        title="Setups"
        items={setups}
        addAction={addSetup}
        renameAction={renameSetup}
        archiveAction={archiveSetup}
      />
    </>
  );
}

function ManagedListSection({
  id,
  title,
  items,
  addAction,
  renameAction,
  archiveAction,
}: {
  id: string;
  title: string;
  items: ManagedListItem[];
  addAction: (name: string) => Promise<void>;
  renameAction: (oldName: string, newName: string) => Promise<void>;
  archiveAction: (name: string) => Promise<void>;
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setError(undefined);
    startTransition(async () => {
      try {
        await addAction(trimmed);
        setNewName("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add.");
      }
    });
  }

  const columns: DataTableColumn<ManagedListItem>[] = [
    {
      key: "name",
      header: "Name",
      render: (item) => (
        <RenameCell item={item} onRename={renameAction} disabled={pending} />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <span
          className={
            item.archived ? "text-muted text-xs" : "text-profit text-xs"
          }
        >
          {item.archived ? "Archived" : "Active"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item) =>
        !item.archived && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await archiveAction(item.name);
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
    <Section id={id} title={title}>
      <div className="mb-3 flex max-w-sm items-end gap-2">
        <Field
          label={`New ${title.toLowerCase().replace(/s$/, "")}`}
          error={error}
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            disabled={pending}
            className={`${inputClass} w-full`}
          />
        </Field>
        <button
          type="button"
          disabled={pending}
          onClick={handleAdd}
          className="bg-accent text-text hover:bg-accent/90 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors duration-[120ms] disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <DataTable columns={columns} rows={items} rowKey={(item) => item.name} />
    </Section>
  );
}

function RenameCell({
  item,
  onRename,
  disabled,
}: {
  item: ManagedListItem;
  onRename: (oldName: string, newName: string) => Promise<void>;
  disabled: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(item.name);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const dirty = value.trim() !== item.name && value.trim() !== "";

  function handleSave() {
    setError(undefined);
    startTransition(async () => {
      try {
        await onRename(item.name, value.trim());
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not rename.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && dirty && handleSave()}
          disabled={disabled || pending || item.archived}
          className={`${inputClass} w-40`}
        />
        {dirty && (
          <button
            type="button"
            disabled={pending}
            onClick={handleSave}
            className="text-accent text-xs hover:underline disabled:opacity-50"
          >
            Save
          </button>
        )}
      </div>
      {error && <span className="text-loss text-xs">{error}</span>}
    </div>
  );
}
