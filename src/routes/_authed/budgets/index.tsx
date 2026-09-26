import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/page-states";
import { budgetsQuery } from "@/features/budgets/api";
import { formatDate, formatMoney } from "@/lib/temporal";

export const Route = createFileRoute("/_authed/budgets/")({ component: BudgetList });

function BudgetList() {
  const { data, isPending, error, refetch } = useQuery(budgetsQuery);
  return (
    <section aria-labelledby="budgets-title" className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="budgets-title" className="text-2xl font-bold">
          Budgets
        </h1>
        <Link to="/budgets/new" className={buttonVariants()}>
          New budget
        </Link>
      </div>
      {isPending ? (
        <LoadingState label="Loading budgets" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState
          title="No budgets yet"
          action={<Link to="/budgets/new">Create your first budget</Link>}
        >
          A budget covers a period in one currency, with income and expense categories.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map((b) => (
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
                <CardContent>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-muted-foreground">Income (actual / estimated to date)</dt>
                    <dd className="text-right">
                      {formatMoney(b.actualIncome, b.currency)} /{" "}
                      {formatMoney(b.estimatedIncomeToDate, b.currency)}
                    </dd>
                    <dt className="text-muted-foreground">Expenses (actual / estimated to date)</dt>
                    <dd className="text-right">
                      {formatMoney(b.actualExpense, b.currency)} /{" "}
                      {formatMoney(b.estimatedExpenseToDate, b.currency)}
                    </dd>
                  </dl>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
