import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangleIcon, CircleAlertIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComparisonChart } from "@/components/charts/comparison-chart";
import { DataTable } from "@/components/charts/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/page-states";
import { dashboardQuery, type Alert } from "@/features/reports/api";
import { formatDate, formatDateTime, formatMoney } from "@/lib/temporal";

export const Route = createFileRoute("/_authed/")({ component: Dashboard });

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data, isPending, error, refetch } = useQuery(dashboardQuery);
  return (
    <section aria-labelledby="dashboard-title" className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="dashboard-title" className="text-2xl font-bold">
          Welcome, {user.firstName}
        </h1>
        <Link to="/transactions/new" className={buttonVariants()}>
          Record transaction
        </Link>
      </div>
      {isPending ? (
        <LoadingState label="Loading dashboard" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.budgets.length === 0 ? (
        <EmptyState title="No budgets yet" action={<Link to="/budgets/new">Create a budget</Link>}>
          Your budgets, recent transactions and alerts will show up here.
        </EmptyState>
      ) : (
        <>
          <section aria-labelledby="budgets-summary" className="grid gap-4">
            <h2 id="budgets-summary" className="text-xl font-semibold">
              Budgets
            </h2>
            <ul className="grid gap-4 lg:grid-cols-2">
              {data.budgets.map((b) => {
                const rows = [
                  {
                    id: "income",
                    label: "Income",
                    estimated: Number(b.estimatedIncomeToDate),
                    actual: Number(b.actualIncome),
                  },
                  {
                    id: "expense",
                    label: "Expenses",
                    estimated: Number(b.estimatedExpenseToDate),
                    actual: Number(b.actualExpense),
                  },
                ];
                return (
                  <li key={b.id}>
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          <Link to="/budgets/$budgetId" params={{ budgetId: b.id }}>
                            {b.name}
                          </Link>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {b.currency} · {formatDate(b.startDate)} – {formatDate(b.endDate)}
                        </p>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        <p>
                          <span className="text-sm text-muted-foreground">Net so far</span>
                          <span className="block text-3xl font-semibold">
                            {formatMoney(b.net, b.currency)}
                          </span>
                        </p>
                        <ComparisonChart
                          title="Estimated vs actual to date"
                          currency={b.currency}
                          rows={rows}
                          summary={`Income ${formatMoney(b.actualIncome, b.currency)} of ${formatMoney(b.estimatedIncomeToDate, b.currency)} estimated; expenses ${formatMoney(b.actualExpense, b.currency)} of ${formatMoney(b.estimatedExpenseToDate, b.currency)} estimated.`}
                        />
                        <details>
                          <summary className="cursor-pointer text-sm">Show as table</summary>
                          <DataTable
                            label={`${b.name} totals`}
                            rows={rows}
                            rowKey={(r) => r.id}
                            columns={[
                              { key: "l", header: "", cell: (r) => r.label },
                              {
                                key: "e",
                                header: "Estimated to date",
                                numeric: true,
                                cell: (r) => formatMoney(r.estimated, b.currency),
                              },
                              {
                                key: "a",
                                header: "Actual",
                                numeric: true,
                                cell: (r) => formatMoney(r.actual, b.currency),
                              },
                            ]}
                          />
                        </details>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="alerts-title" className="grid gap-3">
            <h2 id="alerts-title" className="text-xl font-semibold">
              Alerts
            </h2>
            {data.alerts.length === 0 ? (
              <p className="text-muted-foreground">No alerts. Everything is on track.</p>
            ) : (
              <ul className="grid gap-2">
                {groupAlerts(data.alerts).map((g) => (
                  <li
                    key={`${g.type}-${g.itemId}`}
                    className="flex items-start gap-2 rounded-md border p-3"
                  >
                    {g.type === "MISSED" ? (
                      <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <AlertTriangleIcon
                        className="mt-0.5 size-4 shrink-0 text-destructive"
                        aria-hidden="true"
                      />
                    )}
                    <div className="grid gap-1">
                      <span>
                        <strong>{g.type === "MISSED" ? "Missed: " : "Over budget: "}</strong>
                        <Link
                          to="/budgets/$budgetId/items/$itemId"
                          params={{ budgetId: g.budgetId, itemId: g.itemId }}
                        >
                          {g.type === "MISSED" && g.messages.length > 1
                            ? `${g.itemName}: ${g.messages.length} past periods with no transaction recorded`
                            : g.messages[0]}
                        </Link>
                      </span>
                      {g.type === "MISSED" && g.messages.length > 1 && (
                        <details>
                          <summary className="cursor-pointer text-sm text-muted-foreground">
                            Show periods
                          </summary>
                          <ul className="mt-1 grid list-disc gap-0.5 pl-5 text-sm">
                            {g.messages.map((m) => (
                              <li key={m}>
                                {m.replace(`${g.itemName}: no transaction recorded for `, "")}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="latest-title" className="grid gap-3">
            <h2 id="latest-title" className="text-xl font-semibold">
              Latest transactions
            </h2>
            {data.latestTransactions.length === 0 ? (
              <p className="text-muted-foreground">No transactions yet.</p>
            ) : (
              <DataTable
                label="Latest transactions"
                rows={data.latestTransactions}
                rowKey={(t) => t.id}
                columns={[
                  {
                    key: "when",
                    header: "When",
                    cell: (t) => (
                      <Link to="/transactions/$id" params={{ id: t.id }}>
                        {formatDateTime(t.occurredAt, t.timezone)}
                      </Link>
                    ),
                  },
                  { key: "item", header: "Item", cell: (t) => t.itemName },
                  {
                    key: "amount",
                    header: "Amount",
                    numeric: true,
                    cell: (t) =>
                      `${t.type === "INCOME" ? "+" : "−"}${formatMoney(t.amount, t.currency)}`,
                  },
                ]}
              />
            )}
          </section>
        </>
      )}
    </section>
  );
}

// Several missed periods of one item read as one alert, with the periods one click away.
function groupAlerts(alerts: Alert[]) {
  const groups = new Map<
    string,
    { type: Alert["type"]; budgetId: string; itemId: string; itemName: string; messages: string[] }
  >();
  for (const a of alerts) {
    const key = `${a.type}-${a.itemId}`;
    const itemName = a.message.split(a.type === "MISSED" ? ":" : " is over budget")[0]!;
    if (!groups.has(key))
      groups.set(key, {
        type: a.type,
        budgetId: a.budgetId,
        itemId: a.itemId,
        itemName,
        messages: [],
      });
    groups.get(key)!.messages.push(a.message);
  }
  return [...groups.values()];
}
