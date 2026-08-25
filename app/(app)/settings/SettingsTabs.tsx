"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/lists", label: "Lists" },
  { href: "/settings/playbooks", label: "Playbooks" },
] as const;

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="border-border mb-6 flex items-center gap-5 border-b">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-block border-b-2 py-3 text-sm transition-colors duration-[120ms] ${
              active
                ? "border-accent text-text"
                : "text-muted hover:text-text border-transparent"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
