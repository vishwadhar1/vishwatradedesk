"use client";

import { useMemo, useState } from "react";
import { unstable_rethrow } from "next/navigation";
import { Field } from "@/components/Field";
import { Money } from "@/components/Money";
import { Percent } from "@/components/Percent";
import { R } from "@/components/R";
import { TagChip } from "@/components/TagChip";
import { computePosition, plannedRiskPct } from "@/lib/calc/position";
import { createPosition } from "../actions";

type SymbolMasterEntry = {
  symbol: string;
  companyName: string;
  exchange: string;
};

// No width utility here — every call site sets its own (w-full, w-40, ...).
// Two width classes in one string is a silent cascade-order bug, not a
// merge (see ManagedLists.tsx for the version of this that shipped once).
const inputClass =
  "border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-accent";

const MAX_SUGGESTIONS = 8;

export function NewPositionForm({
  symbolMaster,
  strategies,
  setups,
  accountCapital,
}: {
  symbolMaster: SymbolMasterEntry[];
  strategies: string[];
  setups: string[];
  accountCapital: number | null;
}) {
  const [symbol, setSymbol] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [exchange, setExchange] = useState<"NSE" | "BSE">("NSE");
  const [positionType, setPositionType] = useState<
    "SWING" | "INVESTMENT" | "POSITIONAL"
  >("SWING");
  const [strategy, setStrategy] = useState("");
  const [setup, setSetup] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [plannedEntry, setPlannedEntry] = useState("");
  const [initialStopLoss, setInitialStopLoss] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [plannedQty, setPlannedQty] = useState("");

  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const suggestions = useMemo(() => {
    const query = symbol.trim().toUpperCase();
    if (!query) return [];
    return symbolMaster
      .filter(
        (s) =>
          s.symbol.startsWith(query) ||
          s.companyName.toUpperCase().includes(query),
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [symbol, symbolMaster]);

  function selectSuggestion(entry: SymbolMasterEntry) {
    setSymbol(entry.symbol);
    setCompanyName(entry.companyName);
    setExchange(entry.exchange === "BSE" ? "BSE" : "NSE");
    setSuggestionsOpen(false);
  }

  function addTag() {
    const trimmed = tagInput.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, trimmed]);
    setTagInput("");
  }

  // Direction is LONG-only in the form on purpose — V1's calc engine throws
  // on SHORT, so a form that let you pick it would let you create a position
  // every other screen then can't compute. The DB still models the SHORT
  // enum value; the door isn't closed, just not opened here yet.
  const preview = computePosition(
    {
      direction: "LONG",
      plannedEntry: plannedEntry || null,
      initialStopLoss: initialStopLoss || null,
      targetPrice: targetPrice || null,
      plannedQty: plannedQty ? Number(plannedQty) : null,
    },
    [],
  );
  const riskPct = plannedRiskPct(preview.plannedRisk, accountCapital);

  async function handleSubmit() {
    if (!symbol.trim()) {
      setError("Symbol is required.");
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await createPosition({
        symbol,
        companyName,
        exchange,
        yahooSymbol: "",
        direction: "LONG",
        positionType,
        strategy,
        setup,
        tags,
        plannedEntry: plannedEntry.trim() || null,
        initialStopLoss: initialStopLoss.trim() || null,
        targetPrice: targetPrice.trim() || null,
        plannedQty: plannedQty.trim() ? Number(plannedQty) : null,
      });
    } catch (e) {
      // createPosition ends in redirect() on success, which throws a
      // framework signal, not a real error — let it through uncaught or
      // the navigation never happens and this shows a false error instead.
      // (There's no code path after this try/catch: createPosition either
      // throws a validation Error, handled below, or redirects.)
      unstable_rethrow(e);
      setSaving(false);
      setError(e instanceof Error ? e.message : "Could not create position.");
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-text text-lg font-medium">New Position</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <Field label="Symbol" htmlFor="symbol">
            <input
              id="symbol"
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value.toUpperCase());
                setSuggestionsOpen(true);
              }}
              onFocus={() => setSuggestionsOpen(true)}
              onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
              placeholder="e.g. RELIANCE"
              autoComplete="off"
              required
              className={`${inputClass} w-full`}
            />
          </Field>
          {suggestionsOpen && suggestions.length > 0 && (
            <ul className="border-border bg-surface absolute z-20 mt-1 w-full border">
              {suggestions.map((s) => (
                <li key={s.symbol}>
                  <button
                    type="button"
                    onMouseDown={() => selectSuggestion(s)}
                    className="hover:bg-bg block w-full px-2 py-1.5 text-left text-sm"
                  >
                    <span className="text-text">{s.symbol}</span>{" "}
                    <span className="text-muted text-xs">{s.companyName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Field label="Company name" htmlFor="companyName">
          <input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className={`${inputClass} w-full`}
          />
        </Field>

        <Field label="Exchange" htmlFor="exchange">
          <select
            id="exchange"
            value={exchange}
            onChange={(e) => setExchange(e.target.value as "NSE" | "BSE")}
            className={`${inputClass} w-full`}
          >
            <option value="NSE">NSE</option>
            <option value="BSE">BSE</option>
          </select>
        </Field>

        <Field
          label="Direction"
          htmlFor="direction"
          helper="SHORT isn't supported yet — V1 is long-only."
        >
          <select
            id="direction"
            value="LONG"
            disabled
            className={`${inputClass} w-full`}
          >
            <option value="LONG">LONG</option>
          </select>
        </Field>

        <Field label="Position type" htmlFor="positionType">
          <select
            id="positionType"
            value={positionType}
            onChange={(e) =>
              setPositionType(
                e.target.value as "SWING" | "INVESTMENT" | "POSITIONAL",
              )
            }
            className={`${inputClass} w-full`}
          >
            <option value="SWING">Swing</option>
            <option value="INVESTMENT">Investment</option>
            <option value="POSITIONAL">Positional</option>
          </select>
        </Field>

        <Field label="Strategy" htmlFor="strategy">
          <select
            id="strategy"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className={`${inputClass} w-full`}
          >
            <option value="">—</option>
            {strategies.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Setup" htmlFor="setup">
          <select
            id="setup"
            value={setup}
            onChange={(e) => setSetup(e.target.value)}
            className={`${inputClass} w-full`}
          >
            <option value="">—</option>
            {setups.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Tags" htmlFor="tagInput">
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              onRemove={() => setTags((prev) => prev.filter((t) => t !== tag))}
            />
          ))}
          <input
            id="tagInput"
            value={tagInput}
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

      <div>
        <h2 className="text-text mb-3 text-sm font-medium">Plan</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Planned entry (₹)" htmlFor="plannedEntry">
            <input
              id="plannedEntry"
              type="number"
              step="0.01"
              min="0"
              value={plannedEntry}
              onChange={(e) => setPlannedEntry(e.target.value)}
              className={`${inputClass} w-full`}
            />
          </Field>
          <Field label="Initial stop loss (₹)" htmlFor="initialStopLoss">
            <input
              id="initialStopLoss"
              type="number"
              step="0.01"
              min="0"
              value={initialStopLoss}
              onChange={(e) => setInitialStopLoss(e.target.value)}
              className={`${inputClass} w-full`}
            />
          </Field>
          <Field label="Target price (₹)" htmlFor="targetPrice">
            <input
              id="targetPrice"
              type="number"
              step="0.01"
              min="0"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className={`${inputClass} w-full`}
            />
          </Field>
          <Field label="Planned quantity" htmlFor="plannedQty">
            <input
              id="plannedQty"
              type="number"
              step="1"
              min="1"
              value={plannedQty}
              onChange={(e) => setPlannedQty(e.target.value)}
              className={`${inputClass} w-full`}
            />
          </Field>
        </div>

        <div className="border-border bg-surface mt-4 flex items-center gap-6 border px-3 py-2 text-sm">
          <div>
            <span className="text-muted text-xs">Planned risk</span>
            <div className="flex items-center gap-2">
              <Money value={preview.plannedRisk} />
              <span className="text-muted text-xs">
                (<Percent value={riskPct} /> of capital)
              </span>
            </div>
          </div>
          <div>
            <span className="text-muted text-xs">Planned R:R</span>
            <div>
              {preview.plannedRR === null ? (
                <span className="text-muted">—</span>
              ) : (
                <R value={preview.plannedRR} />
              )}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-loss text-xs">{error}</p>}

      <button
        type="button"
        disabled={saving}
        onClick={handleSubmit}
        className="bg-accent text-text hover:bg-accent/90 self-start rounded-sm px-4 py-2 text-sm font-medium transition-colors duration-[120ms] disabled:opacity-50"
      >
        {saving ? "Creating…" : "Create Position"}
      </button>
    </div>
  );
}
