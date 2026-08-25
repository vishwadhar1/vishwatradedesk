"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/app/(app)/actions";
import { StalenessDot } from "@/components/StalenessDot";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", key: "d" },
  { href: "/journal", label: "Journal", key: "j" },
  { href: "/trade-log", label: "Trade Log", key: "l" },
] as const;

const CHORD_TIMEOUT_MS = 600;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function Nav({ email }: { email: string | null | undefined }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let pendingG = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function resetPendingG() {
      pendingG = false;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = null;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target))
        return;
      const key = e.key.toLowerCase();

      if (pendingG) {
        resetPendingG();
        const match = NAV_ITEMS.find((item) => item.key === key);
        if (match) {
          e.preventDefault();
          router.push(match.href);
        }
        return;
      }

      if (key === "g") {
        pendingG = true;
        timeoutId = setTimeout(resetPendingG, CHORD_TIMEOUT_MS);
        return;
      }

      if (key === "n") {
        e.preventDefault();
        router.push("/journal/new");
        return;
      }

      if (key === "/") {
        e.preventDefault();
        document
          .querySelector<HTMLElement>('[data-shortcut="search"]')
          ?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      resetPendingG();
    };
  }, [router]);

  return (
    <nav className="border-border flex h-12 items-center justify-between border-b px-4">
      <div className="flex items-center gap-6">
        <span className="text-text text-sm font-semibold">TradeDesk</span>
        <ul className="flex items-center gap-5">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`inline-block border-b-2 py-3 text-sm transition-colors duration-[120ms] ${
                    active
                      ? "border-accent text-text"
                      : "text-muted hover:text-text border-transparent"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <PricesControl />
        <button
          type="button"
          onClick={() => router.push("/journal/new")}
          className="bg-accent text-text hover:bg-accent/90 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors duration-[120ms]"
        >
          + New
        </button>
        <AccountMenu email={email} />
      </div>
    </nav>
  );
}

function PricesControl() {
  // Stub for this phase — no real fetching yet. Fixed timestamp just to
  // demonstrate the staleness read; wired up to a real refresh in Phase 7.
  const stubFetchedAt = new Date(Date.now() - 2 * 60_000);

  return (
    <button
      type="button"
      className="border-border text-muted hover:text-text flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs"
    >
      <StalenessDot timestamp={stubFetchedAt} />↻ Prices · 2m ago
    </button>
  );
}

function AccountMenu({ email }: { email: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initial = email?.charAt(0).toUpperCase() ?? "?";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="border-border text-muted hover:text-text flex h-7 w-7 items-center justify-center rounded-sm border text-xs"
      >
        {initial}
      </button>
      {open && (
        <div className="border-border bg-surface absolute top-full right-0 z-20 mt-1 w-40 border">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="text-text hover:bg-bg block px-3 py-2 text-xs"
          >
            Settings
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-text hover:bg-bg block w-full px-3 py-2 text-left text-xs"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
