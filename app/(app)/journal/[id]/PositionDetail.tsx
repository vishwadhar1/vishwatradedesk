"use client";

import Link from "next/link";
import { unstable_rethrow, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdherenceBar } from "@/components/AdherenceBar";
import { Field } from "@/components/Field";
import { Money } from "@/components/Money";
import { PnL } from "@/components/PnL";
import { R } from "@/components/R";
import { Section } from "@/components/Section";
import { SignedPercent } from "@/components/SignedPercent";
import { StatusPill } from "@/components/StatusPill";
import { TagChip } from "@/components/TagChip";
import type { positions } from "@/db/schema";
import { formatHolding, formatQty } from "@/lib/calc/format";
import {
  readRuleSnapshot,
  type ComputedPosition,
  type RuleSnapshot,
} from "@/lib/calc/position";
import {
  setInitialStopLoss,
  updateBasicFields,
  updateCurrentStopLoss,
  updatePlannedEntry,
  updatePlannedQty,
  updatePlaybookSelection,
  updateRulesFollowed,
  updateTags,
  updateTargetPrice,
  type BasicFieldUpdate,
} from "../actions";

type PositionRow = typeof positions.$inferSelect;
type PlaybookOption = { id: string; name: string };

const inputClass =
  "border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-accent disabled:opacity-50";

// realizedR when something's actually settled, else the live openR estimate —
// not a new calc metric, just which of the two existing ones is most concrete.
function currentR(computed: ComputedPosition | null): number | null {
  if (!computed) return null;
  return computed.realizedR ?? computed.openR;
}

export function PositionDetail({
  position,
  computed,
  computeError,
  strategies,
  setups,
  playbooks,
}: {
  position: PositionRow;
  computed: ComputedPosition | null;
  computeError: string | null;
  strategies: string[];
  setups: string[];
  playbooks: PlaybookOption[];
}) {
  const ruleSnapshot = readRuleSnapshot(position.rulesFollowed);
  const followed = ruleSnapshot?.filter((r) => r.followed).length ?? null;
  const total = ruleSnapshot?.length ?? null;

  return (
    <div className="-mx-4 -mt-6">
      <StickyHeader
        position={position}
        computed={computed}
        followed={followed}
        total={total}
      />

      {computeError && (
        <p className="text-loss border-border border-b px-4 py-2 text-xs">
          Calculations unavailable: {computeError}
        </p>
      )}

      <div className="flex gap-8 px-4 pt-6">
        <LeftRail />
        <div className="min-w-0 flex-1">
          <Section id="plan" title="Plan">
            <PlanSection
              position={position}
              strategies={strategies}
              setups={setups}
            />
          </Section>
          <Section id="playbook" title="Playbook">
            <PlaybookSection
              position={position}
              playbooks={playbooks}
              ruleSnapshot={ruleSnapshot}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

function LeftRail() {
  const links = [
    { href: "#plan", label: "Plan" },
    { href: "#playbook", label: "Playbook" },
  ];
  return (
    <nav className="sticky top-20 h-fit w-32 shrink-0">
      <ul className="flex flex-col gap-1">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              className="text-muted hover:text-text block py-1 text-xs"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function StickyHeader({
  position,
  computed,
  followed,
  total,
}: {
  position: PositionRow;
  computed: ComputedPosition | null;
  followed: number | null;
  total: number | null;
}) {
  return (
    <div className="bg-bg border-border sticky top-0 z-10 border-b px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-text text-base font-medium">
          {position.symbol}{" "}
          <span className="text-muted font-normal">
            · {position.companyName} · {position.exchange}
          </span>
        </h1>
        {computed && <StatusPill status={computed.status} />}
        {position.tags.map((tag) => (
          <TagChip key={tag} label={tag} />
        ))}
      </div>
      <div className="text-muted mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
        <StatItem label="Open qty">
          {computed ? formatQty(computed.openQty) : "—"}
        </StatItem>
        <StatItem label="Avg buy">
          <Money value={computed?.avgBuyPrice ?? null} />
        </StatItem>
        <StatItem label="CMP">
          <Money value={position.currentPrice} />
        </StatItem>
        <StatItem label="Net P&L">
          <PnL value={computed?.netPnl ?? null} />
        </StatItem>
        <StatItem label="Net P&L %">
          <SignedPercent value={computed?.netPnlPct ?? null} />
        </StatItem>
        <StatItem label="R">
          <R value={currentR(computed)} />
        </StatItem>
        <StatItem label="Adherence">
          <AdherenceBar followed={followed} total={total} />
        </StatItem>
        <StatItem label="Held">
          {computed?.holdingDays == null ? (
            <span className="text-muted">—</span>
          ) : (
            formatHolding(computed.holdingDays)
          )}
        </StatItem>
      </div>
    </div>
  );
}

function StatItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted">{label}</span>
      <span className="text-text">{children}</span>
    </span>
  );
}

// ---- Plan section ----

function PlanSection({
  position,
  strategies,
  setups,
}: {
  position: PositionRow;
  strategies: string[];
  setups: string[];
}) {
  return (
    <div className="grid max-w-2xl grid-cols-2 gap-4">
      <AutosaveTextField
        key={`symbol-${position.symbol}`}
        label="Symbol"
        initialValue={position.symbol}
        onSave={(v) =>
          updateBasicFields(position.id, { symbol: v.toUpperCase() })
        }
      />
      <AutosaveTextField
        key={`companyName-${position.companyName}`}
        label="Company name"
        initialValue={position.companyName}
        onSave={(v) => updateBasicFields(position.id, { companyName: v })}
      />
      <AutosaveSelectField
        key={`exchange-${position.exchange}`}
        label="Exchange"
        initialValue={position.exchange}
        options={[
          { value: "NSE", label: "NSE" },
          { value: "BSE", label: "BSE" },
        ]}
        onSave={(v) =>
          updateBasicFields(position.id, {
            exchange: v as BasicFieldUpdate["exchange"],
          })
        }
      />
      <AutosaveTextField
        key={`yahooSymbol-${position.yahooSymbol}`}
        label="Yahoo symbol"
        initialValue={position.yahooSymbol}
        onSave={(v) => updateBasicFields(position.id, { yahooSymbol: v })}
      />

      <Field label="Direction" helper="Locked — V1 is long-only.">
        <input
          value={position.direction}
          disabled
          className={`${inputClass} w-full`}
        />
      </Field>

      <AutosaveSelectField
        key={`positionType-${position.positionType}`}
        label="Position type"
        initialValue={position.positionType}
        options={[
          { value: "SWING", label: "Swing" },
          { value: "INVESTMENT", label: "Investment" },
          { value: "POSITIONAL", label: "Positional" },
        ]}
        onSave={(v) =>
          updateBasicFields(position.id, {
            positionType: v as BasicFieldUpdate["positionType"],
          })
        }
      />

      <AutosaveSelectField
        key={`strategy-${position.strategy}`}
        label="Strategy"
        initialValue={position.strategy}
        options={[
          { value: "", label: "—" },
          ...strategies.map((s) => ({ value: s, label: s })),
        ]}
        onSave={(v) => updateBasicFields(position.id, { strategy: v })}
      />

      <AutosaveSelectField
        key={`setup-${position.setup}`}
        label="Setup"
        initialValue={position.setup}
        options={[
          { value: "", label: "—" },
          ...setups.map((s) => ({ value: s, label: s })),
        ]}
        onSave={(v) => updateBasicFields(position.id, { setup: v })}
      />

      <div className="col-span-2">
        <TagsField positionId={position.id} initialTags={position.tags} />
      </div>

      <AutosaveTextField
        key={`plannedEntry-${position.plannedEntry}`}
        label="Planned entry (₹)"
        type="number"
        initialValue={position.plannedEntry ?? ""}
        onSave={(v) => updatePlannedEntry(position.id, v)}
      />

      <InitialStopLossField position={position} />

      <AutosaveTextField
        key={`currentStopLoss-${position.currentStopLoss}`}
        label="Current stop (₹)"
        type="number"
        initialValue={position.currentStopLoss ?? ""}
        disabled={position.initialStopLoss === null}
        helper={
          position.initialStopLoss === null
            ? "Set the initial stop first."
            : "Editing this logs a management note."
        }
        onSave={(v) => updateCurrentStopLoss(position.id, v)}
      />

      <AutosaveTextField
        key={`targetPrice-${position.targetPrice}`}
        label="Target price (₹)"
        type="number"
        initialValue={position.targetPrice ?? ""}
        helper="Editing this logs a management note."
        onSave={(v) => updateTargetPrice(position.id, v)}
      />

      <AutosaveTextField
        key={`plannedQty-${position.plannedQty}`}
        label="Planned quantity"
        type="number"
        initialValue={position.plannedQty?.toString() ?? ""}
        onSave={(v) => updatePlannedQty(position.id, v)}
      />
    </div>
  );
}

function InitialStopLossField({ position }: { position: PositionRow }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  if (position.initialStopLoss !== null) {
    return (
      <Field
        label="Initial stop loss (₹)"
        helper="Write-once — locked after creation."
      >
        <input
          value={position.initialStopLoss}
          disabled
          className={`${inputClass} w-full`}
        />
      </Field>
    );
  }

  function handleSet() {
    setError(undefined);
    startTransition(async () => {
      try {
        await setInitialStopLoss(position.id, value);
        router.refresh();
      } catch (e) {
        unstable_rethrow(e);
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  return (
    <Field
      label="Initial stop loss (₹)"
      helper="Write-once — set it once, then it's locked."
      error={error}
    >
      <div className="flex gap-2">
        <input
          type="number"
          value={value}
          disabled={pending}
          onChange={(e) => setValue(e.target.value)}
          className={`${inputClass} w-full`}
        />
        <button
          type="button"
          disabled={pending || !value.trim()}
          onClick={handleSet}
          className="bg-accent text-text hover:bg-accent/90 shrink-0 rounded-sm px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          Set
        </button>
      </div>
    </Field>
  );
}

function TagsField({
  positionId,
  initialTags,
}: {
  positionId: string;
  initialTags: string[];
}) {
  const router = useRouter();
  const [tags, setTags] = useState(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [pending, startTransition] = useTransition();

  function persist(next: string[]) {
    setTags(next);
    startTransition(async () => {
      await updateTags(positionId, next);
      router.refresh();
    });
  }

  function addTag() {
    const trimmed = tagInput.trim();
    setTagInput("");
    if (!trimmed || tags.includes(trimmed)) return;
    persist([...tags, trimmed]);
  }

  return (
    <Field label="Tags">
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <TagChip
            key={tag}
            label={tag}
            onRemove={() => persist(tags.filter((t) => t !== tag))}
          />
        ))}
        <input
          value={tagInput}
          disabled={pending}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== ",") return;
            e.preventDefault();
            addTag();
          }}
          onBlur={addTag}
          placeholder="Add a tag, press Enter"
          className={`${inputClass} w-40`}
        />
      </div>
    </Field>
  );
}

// ---- Generic autosave fields ----

function AutosaveTextField({
  label,
  initialValue,
  onSave,
  type = "text",
  disabled,
  helper,
}: {
  label: string;
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  type?: string;
  disabled?: boolean;
  helper?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleBlur() {
    if (value === initialValue) return;
    setError(undefined);
    startTransition(async () => {
      try {
        await onSave(value);
        router.refresh();
      } catch (e) {
        unstable_rethrow(e);
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  return (
    <Field label={label} error={error} helper={error ? undefined : helper}>
      <input
        type={type}
        value={value}
        disabled={disabled || pending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        className={`${inputClass} w-full`}
      />
    </Field>
  );
}

function AutosaveSelectField({
  label,
  initialValue,
  options,
  onSave,
}: {
  label: string;
  initialValue: string;
  options: { value: string; label: string }[];
  onSave: (value: string) => Promise<void>;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleChange(next: string) {
    setValue(next);
    setError(undefined);
    startTransition(async () => {
      try {
        await onSave(next);
        router.refresh();
      } catch (e) {
        unstable_rethrow(e);
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  return (
    <Field label={label} error={error}>
      <select
        value={value}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value)}
        className={`${inputClass} w-full`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

// ---- Playbook section ----

function PlaybookSection({
  position,
  playbooks,
  ruleSnapshot,
}: {
  position: PositionRow;
  playbooks: PlaybookOption[];
  ruleSnapshot: RuleSnapshot[] | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleSelect(playbookId: string) {
    setError(undefined);
    startTransition(async () => {
      try {
        await updatePlaybookSelection(position.id, playbookId || null);
        router.refresh();
      } catch (e) {
        unstable_rethrow(e);
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  function toggleRule(ruleId: string) {
    if (!ruleSnapshot) return;
    const next = ruleSnapshot.map((r) =>
      r.id === ruleId ? { ...r, followed: !r.followed } : r,
    );
    startTransition(async () => {
      await updateRulesFollowed(position.id, next);
      router.refresh();
    });
  }

  const followed = ruleSnapshot?.filter((r) => r.followed).length ?? null;
  const total = ruleSnapshot?.length ?? null;

  return (
    <div className="max-w-2xl">
      <Field label="Playbook" error={error}>
        <select
          value={position.playbookId ?? ""}
          disabled={pending}
          onChange={(e) => handleSelect(e.target.value)}
          className={`${inputClass} w-full`}
        >
          <option value="">— None —</option>
          {playbooks.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>

      {ruleSnapshot && ruleSnapshot.length > 0 && (
        <div className="mt-4">
          <div className="mb-2">
            <AdherenceBar followed={followed} total={total} />
          </div>
          <ul className="flex flex-col gap-2">
            {ruleSnapshot.map((rule) => (
              <li key={rule.id}>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rule.followed}
                    disabled={pending}
                    onChange={() => toggleRule(rule.id)}
                    className="mt-0.5"
                  />
                  <span className="text-text">{rule.text}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!position.playbookId && (
        <p className="text-muted mt-2 text-xs">
          No playbook attached.{" "}
          <Link
            href="/settings/playbooks"
            className="text-accent hover:underline"
          >
            Manage playbooks
          </Link>
          .
        </p>
      )}
    </div>
  );
}
