"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Boxes, Network, Wrench, Home, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/ui";

const navItems = [
  { href: "/", label: "HOME", icon: Home },
  { href: "/agents", label: "AGENTS", icon: Bot },
  { href: "/blocks", label: "MEMORY BLOCKS", icon: Boxes },
  { href: "/tools", label: "TOOLS", icon: Wrench },
  { href: "/network", label: "NETWORK MAP", icon: Network },
  { href: "/settings", label: "SETTINGS", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <Link
        href="/"
        className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-4 py-4"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <Bot className="h-4 w-4 text-[var(--color-accent)]" />
        </div>
        <div>
          <p className="font-mono text-sm font-semibold uppercase tracking-wide text-[var(--color-foreground)]">
            LettaCP
          </p>
          <p className="font-mono text-[10px] uppercase text-[var(--color-subtle)]">
            app server admin
          </p>
        </div>
      </Link>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-sm px-3 py-2 font-mono text-xs uppercase tracking-wide transition-colors",
                active
                  ? "border-l-2 border-[var(--color-accent)] bg-[var(--color-surface-2)] text-[var(--color-foreground)]"
                  : "border-l-2 border-transparent text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-border)] p-4">
        <div className="flex items-center gap-2">
          <StatusDot status="ok" />
          <p className="font-mono text-[10px] uppercase text-[var(--color-subtle)]">
            connected
          </p>
        </div>
        <p className="mt-1.5 truncate font-mono text-[10px] text-[var(--color-muted)]">
          LETTA_APP_SERVER_URL
        </p>
      </div>
    </aside>
  );
}
