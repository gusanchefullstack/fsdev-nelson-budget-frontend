import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/page-states";
import { PositiveMark } from "@/components/positive-mark";
import type { BudgetDetail } from "@/features/budgets/api";
import { formatMoney } from "@/lib/temporal";
import {
  initialCollapsed,
  toOverview,
  type OverviewRow,
  type OverviewStatus,
} from "./overview-model";

/** Money with a true minus sign ("−USD 10.00") so negatives read clearly. */
function signedMoney(amount: string, currency: string) {
  const n = Number(amount);
  return n < 0 ? `−${formatMoney(Math.abs(n), currency)}` : formatMoney(n, currency);
}

const STATUS: Record<OverviewStatus, { label: string; Icon: typeof Check }> = {
  over: { label: "Over", Icon: ArrowUp },
  under: { label: "Under", Icon: ArrowDown },
  onTrack: { label: "On track", Icon: Check },
};

/** Estimated vs actual for a budget in use (spec 004 US1, US2). */
export function BudgetOverview({ budget }: { budget: BudgetDetail }) {
  const root = useMemo(() => toOverview(budget), [budget]);
  const [collapsed, setCollapsed] = useState(() => initialCollapsed(root));

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section aria-labelledby="overview-title" className="grid gap-3">
      <h2 id="overview-title" className="text-xl font-semibold">
        Overview
      </h2>
      {budget.counts.items === 0 ? (
        <EmptyState title="Nothing to show yet">
          Add items to see how this budget is going.
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Estimated and actual cover the whole budget. Status compares the actual with what was
            expected by today (±10%).
          </p>
          <ul className="rounded-lg border bg-card px-3 text-card-foreground md:px-4">
            <li>
              <div className="grid gap-1 py-3">
                <span data-row-name className="font-semibold break-words">
                  {root.name}
                </span>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span>Estimated net {signedMoney(root.estimatedTotal, budget.currency)}</span>
                  <span>
                    Actual net{" "}
                    {Number(root.actual) > 0 ? (
                      <PositiveMark>{signedMoney(root.actual, budget.currency)}</PositiveMark>
                    ) : (
                      signedMoney(root.actual, budget.currency)
                    )}
                  </span>
                </div>
              </div>
              <ul>
                {root.children.map((g) => (
                  <Row
                    key={g.id}
                    row={g}
                    currency={budget.currency}
                    collapsed={collapsed}
                    onToggle={toggle}
                  />
                ))}
              </ul>
            </li>
          </ul>
        </>
      )}
    </section>
  );
}

type RowProps = {
  row: OverviewRow;
  currency: string;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
};

function Row({ row, currency, collapsed, onToggle }: RowProps) {
  const collapsible = row.kind !== "item" && row.children.length > 0;
  const open = !collapsed.has(row.id);
  const listId = `overview-${row.id}`;
  const { label, Icon } = STATUS[row.status ?? "onTrack"];
  const Chevron = open ? ChevronDown : ChevronRight;
  const name = (
    <span data-row-name className={`break-words ${row.kind === "item" ? "" : "font-semibold"}`}>
      {row.name}
    </span>
  );

  return (
    <li className="border-t">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        {collapsible ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            onClick={() => onToggle(row.id)}
            className="flex min-w-0 items-center gap-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Chevron aria-hidden="true" className="size-4 shrink-0" />
            {name}
          </button>
        ) : (
          <span className={`min-w-0 ${row.kind === "item" ? "" : "pl-5"}`}>{name}</span>
        )}
        <span
          data-status
          className={`inline-flex items-center gap-1 justify-self-end rounded-full border px-2 py-0.5 text-xs font-medium md:order-3 ${
            row.adverse
              ? "border-destructive text-destructive"
              : "border-border text-muted-foreground"
          }`}
        >
          <Icon aria-hidden="true" className="size-3.5" />
          {label}
        </span>
        <div className="col-span-2 flex flex-wrap gap-x-4 text-sm md:order-2 md:col-span-1 md:justify-end">
          <span>Estimated {formatMoney(row.estimatedTotal, currency)}</span>
          <span>Actual {formatMoney(row.actual, currency)}</span>
        </div>
        <div className="col-span-2 flex items-center gap-2 md:order-4 md:col-span-3">
          <div
            aria-hidden="true"
            className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${row.share * 100}%` }}
            />
            {row.exceeded && (
              <div
                className={`absolute inset-y-0 right-0 w-1.5 ${
                  row.type === "EXPENSE" ? "bg-destructive" : "bg-foreground"
                }`}
              />
            )}
          </div>
          {row.exceeded && (
            <span
              className={`text-xs ${row.type === "EXPENSE" ? "text-destructive" : "text-muted-foreground"}`}
            >
              exceeded
            </span>
          )}
        </div>
      </div>
      {collapsible && open && (
        <ul id={listId} className="pl-3 md:pl-5">
          {row.children.map((c) => (
            <Row key={c.id} row={c} currency={currency} collapsed={collapsed} onToggle={onToggle} />
          ))}
        </ul>
      )}
    </li>
  );
}
