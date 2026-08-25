import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { Field } from "@/components/Field";
import { Section } from "@/components/Section";
import { updateGeneralSettings } from "../actions";

const inputClass =
  "w-full border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-accent";

export default async function GeneralSettingsPage() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));

  return (
    <Section id="general" title="General">
      <form
        action={updateGeneralSettings}
        className="flex max-w-sm flex-col gap-4"
      >
        <Field
          label="Account capital (₹)"
          htmlFor="accountCapital"
          helper="Used as the denominator for Return %."
        >
          <input
            id="accountCapital"
            name="accountCapital"
            type="number"
            step="0.01"
            min="0"
            defaultValue={row?.accountCapital ?? ""}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Default exchange" htmlFor="defaultExchange">
          <select
            id="defaultExchange"
            name="defaultExchange"
            defaultValue={row?.defaultExchange ?? "NSE"}
            className={inputClass}
          >
            <option value="NSE">NSE</option>
            <option value="BSE">BSE</option>
          </select>
        </Field>

        <Field
          label="Breakeven handling"
          htmlFor="breakevenHandling"
          helper="How a zero-P&L closed trade counts toward win rate."
        >
          <select
            id="breakevenHandling"
            name="breakevenHandling"
            defaultValue={row?.breakevenHandling ?? "EXCLUDE"}
            className={inputClass}
          >
            <option value="EXCLUDE">Exclude from win rate</option>
            <option value="COUNT_AS_LOSS">Count as loss</option>
          </select>
        </Field>

        <button
          type="submit"
          className="bg-accent text-text hover:bg-accent/90 self-start rounded-sm px-3 py-1.5 text-xs font-medium transition-colors duration-[120ms]"
        >
          Save
        </button>
      </form>
    </Section>
  );
}
