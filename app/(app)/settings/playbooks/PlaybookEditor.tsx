"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Field } from "@/components/Field";
import { Section } from "@/components/Section";
import {
  createPlaybook,
  updatePlaybook,
  type PlaybookRuleInput,
} from "../actions";

const inputClass =
  "w-full border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-accent";

type Playbook = {
  id: string;
  name: string;
  description: string;
  rules: PlaybookRuleInput[];
};

export function PlaybookEditor({ playbook }: { playbook: Playbook | null }) {
  const router = useRouter();
  const [name, setName] = useState(playbook?.name ?? "");
  const [description, setDescription] = useState(playbook?.description ?? "");
  const [rules, setRules] = useState<PlaybookRuleInput[]>(
    playbook?.rules ?? [],
  );
  const [newRuleText, setNewRuleText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function addRule() {
    const trimmed = newRuleText.trim();
    if (!trimmed) return;
    setRules((prev) => [...prev, { id: crypto.randomUUID(), text: trimmed }]);
    setNewRuleText("");
  }

  function updateRuleText(id: string, text: string) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, text } : r)));
  }

  function removeRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  function moveRule(index: number, direction: -1 | 1) {
    setRules((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSave() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      try {
        if (playbook) {
          await updatePlaybook(playbook.id, name, description, rules);
          router.refresh();
        } else {
          await createPlaybook(name, description, rules);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  return (
    <Section
      id="playbook-editor"
      title={playbook ? "Edit playbook" : "New playbook"}
    >
      <div className="flex max-w-lg flex-col gap-4">
        <Field label="Name" htmlFor="playbook-name" error={error}>
          <input
            id="playbook-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Description" htmlFor="playbook-description">
          <textarea
            id="playbook-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </Field>

        <div>
          <span className="text-muted text-xs">Rules</span>
          <ul className="mt-1 flex flex-col gap-2">
            {rules.map((rule, i) => (
              <li key={rule.id} className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => moveRule(i, -1)}
                    aria-label="Move rule up"
                    className="text-muted hover:text-text text-xs leading-none disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={i === rules.length - 1}
                    onClick={() => moveRule(i, 1)}
                    aria-label="Move rule down"
                    className="text-muted hover:text-text text-xs leading-none disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <input
                  value={rule.text}
                  onChange={(e) => updateRuleText(rule.id, e.target.value)}
                  className={`${inputClass} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => removeRule(rule.id)}
                  className="text-muted hover:text-loss text-xs"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={newRuleText}
              onChange={(e) => setNewRuleText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                addRule();
              }}
              placeholder="New rule"
              className={inputClass}
            />
            <button
              type="button"
              onClick={addRule}
              className="text-accent shrink-0 text-xs hover:underline"
            >
              + Add rule
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={handleSave}
          className="bg-accent text-text hover:bg-accent/90 self-start rounded-sm px-3 py-1.5 text-xs font-medium transition-colors duration-[120ms] disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </Section>
  );
}
