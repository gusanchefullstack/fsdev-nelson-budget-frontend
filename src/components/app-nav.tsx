import { Link } from "@tanstack/react-router";

// FR-045 — main sections, in spec order
const NAV_ITEMS = [
  { to: "/", label: "Dashboard" },
  { to: "/budgets", label: "Budgets" },
  { to: "/accounts", label: "Accounts" },
  { to: "/payors", label: "Payors" },
  { to: "/vendors", label: "Vendors" },
  { to: "/transactions", label: "Transactions" },
  { to: "/reports", label: "Reports" },
  { to: "/profile", label: "Profile" },
] as const;

export function AppNav({
  vertical = false,
  onNavigate,
}: {
  vertical?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <ul className={vertical ? "grid gap-1" : "flex flex-wrap items-center gap-1"}>
      {NAV_ITEMS.map((item) => (
        <li key={item.to}>
          <Link
            // Routes are added per user story; cast keeps the list in one place.
            to={item.to as "/"}
            onClick={onNavigate}
            activeOptions={{ exact: item.to === "/" }}
            className="block rounded-md px-3 py-2 text-sm text-foreground no-underline hover:bg-muted"
            activeProps={{ className: "bg-muted font-semibold", "aria-current": "page" }}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
