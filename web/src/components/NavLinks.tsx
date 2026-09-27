"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Office" },
  { href: "/approvals", label: "Approvals" },
  { href: "/playbooks", label: "Playbooks" },
  { href: "/ledger", label: "Receipts" },
  { href: "/brain", label: "Brain" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Screens">
      {LINKS.map(({ href, label }) => {
        const current = href === "/" ? path === "/" || path.startsWith("/work-orders") : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={current ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
