import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormField } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { EmptyState, ErrorState, LoadingState } from "@/components/page-states";
import { budgetsQuery } from "@/features/budgets/api";
import { transactionsQuery } from "@/features/transactions/api";
import { formatDateTime, formatMoney } from "@/lib/temporal";

const search = z.object({
  budgetId: z.string().optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.number().int().min(1).optional(),
});

export const Route = createFileRoute("/_authed/transactions/")({
  validateSearch: search,
  component: Transactions,
});

function Transactions() {
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: "/transactions/" });
  const budgets = useQuery(budgetsQuery);
  const { data, isPending, error, refetch } = useQuery(transactionsQuery(filters));
  const setFilter = (patch: Partial<z.infer<typeof search>>) =>
    navigate({ search: (s) => ({ ...s, ...patch, page: undefined }) });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const page = filters.page ?? 1;

  return (
    <section aria-labelledby="tx-list-title" className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="tx-list-title" className="text-2xl font-bold">
          Transactions
        </h1>
        <Link
          to="/transactions/new"
          search={{ budgetId: filters.budgetId }}
          className={buttonVariants()}
        >
          Record transaction
        </Link>
      </div>
      <form
        role="search"
        aria-label="Filter transactions"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <FormField id="f-budget" label="Budget">
          {(a) => (
            <NativeSelect
              {...a}
              value={filters.budgetId ?? ""}
              onChange={(e) => setFilter({ budgetId: e.target.value || undefined })}
            >
              <option value="">All budgets</option>
              {budgets.data?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.currency})
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="f-type" label="Type">
          {(a) => (
            <NativeSelect
              {...a}
              value={filters.type ?? ""}
              onChange={(e) =>
                setFilter({
                  type: (e.target.value || undefined) as "INCOME" | "EXPENSE" | undefined,
                })
              }
            >
              <option value="">Income and expenses</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expenses</option>
            </NativeSelect>
          )}
        </FormField>
        <FormField id="f-from" label="From">
          {(a) => (
            <Input
              {...a}
              type="date"
              value={filters.from ?? ""}
              onChange={(e) => setFilter({ from: e.target.value || undefined })}
            />
          )}
        </FormField>
        <FormField id="f-to" label="To">
          {(a) => (
            <Input
              {...a}
              type="date"
              value={filters.to ?? ""}
              onChange={(e) => setFilter({ to: e.target.value || undefined })}
            />
          )}
        </FormField>
      </form>
      {isPending ? (
        <LoadingState label="Loading transactions" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.data.length === 0 ? (
        <EmptyState
          title="No transactions found"
          action={<Link to="/transactions/new">Record a transaction</Link>}
        />
      ) : (
        <>
          <Table label="Transactions">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">When</TableHead>
                <TableHead scope="col">Item</TableHead>
                <TableHead scope="col">From → To</TableHead>
                <TableHead scope="col" className="text-right">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap">
                    <Link to="/transactions/$id" params={{ id: t.id }}>
                      {formatDateTime(t.occurredAt, t.timezone)}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {t.timezone.replaceAll("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {t.itemName}
                    <span className="block text-xs text-muted-foreground">{t.budgetName}</span>
                  </TableCell>
                  <TableCell>
                    {t.type === "INCOME"
                      ? `${t.payorName} → ${t.accountName}`
                      : `${t.accountName} → ${t.vendorName}`}
                  </TableCell>
                  <TableCell
                    className={t.type === "INCOME" ? "text-right text-success" : "text-right"}
                  >
                    {t.type === "INCOME" ? "+" : "−"}
                    {formatMoney(t.amount, t.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <nav aria-label="Pages" className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => navigate({ search: (s) => ({ ...s, page: page - 1 }) })}
            >
              Previous
            </Button>
            <span>
              Page {page} of {pages} ({data.total} total)
            </span>
            <Button
              variant="outline"
              disabled={page >= pages}
              onClick={() => navigate({ search: (s) => ({ ...s, page: page + 1 }) })}
            >
              Next
            </Button>
          </nav>
        </>
      )}
    </section>
  );
}
