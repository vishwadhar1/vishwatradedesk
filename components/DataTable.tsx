"use client";

import { Fragment, useState } from "react";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  numeric?: boolean;
  sortable?: boolean;
  sortAccessor?: (row: T) => number | string;
  render: (row: T) => React.ReactNode;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  footer?: Partial<Record<string, React.ReactNode>>;
  renderExpanded?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
};

type SortState = { key: string; direction: "asc" | "desc" } | null;

function cellAlign(numeric?: boolean) {
  return numeric ? "text-right tabular-nums" : "text-left";
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  footer,
  renderExpanded,
  onRowClick,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sortedRows = (() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortAccessor) return rows;
    const accessor = column.sortAccessor;
    return [...rows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.direction === "asc" ? cmp : -cmp;
    });
  })();

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sortable) return;
    setSort((prev) => {
      if (!prev || prev.key !== column.key)
        return { key: column.key, direction: "asc" };
      if (prev.direction === "asc")
        return { key: column.key, direction: "desc" };
      return null;
    });
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="border-border w-full overflow-x-auto border">
      <table className="w-full min-w-max border-collapse text-left">
        <thead>
          <tr className="bg-surface sticky top-0 z-10">
            {renderExpanded && (
              <th className="border-border h-8 w-8 border-b px-3" />
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => toggleSort(column)}
                aria-sort={
                  sort?.key === column.key
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
                className={`border-border text-muted h-8 border-b px-3 text-xs font-medium whitespace-nowrap ${cellAlign(
                  column.numeric,
                )} ${column.sortable ? "hover:text-text cursor-pointer select-none" : ""}`}
              >
                {column.header}
                {sort?.key === column.key
                  ? sort.direction === "asc"
                    ? " ▲"
                    : " ▼"
                  : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const key = rowKey(row);
            const isExpanded = expanded.has(key);
            return (
              <Fragment key={key}>
                <tr
                  tabIndex={0}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    if (renderExpanded) toggleExpanded(key);
                    onRowClick?.(row);
                  }}
                  className="border-border hover:bg-surface border-b last:border-b-0"
                >
                  {renderExpanded && (
                    <td className="h-8 px-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(key);
                        }}
                        aria-label={isExpanded ? "Collapse row" : "Expand row"}
                        className="text-muted hover:text-text"
                      >
                        {isExpanded ? "▾" : "▸"}
                      </button>
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`h-8 px-3 ${cellAlign(column.numeric)}`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
                {renderExpanded && isExpanded && (
                  <tr className="border-border bg-bg/40 border-b">
                    <td colSpan={columns.length + 1} className="px-3 py-3">
                      {renderExpanded(row)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        {footer && (
          <tfoot>
            <tr className="border-border bg-surface border-t">
              {renderExpanded && <td className="h-8 px-3" />}
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`h-8 px-3 text-xs font-medium ${cellAlign(column.numeric)}`}
                >
                  {footer[column.key] ?? null}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
