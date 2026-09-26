import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { PositiveMark } from "@/components/positive-mark";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComparisonChart } from "@/components/charts/comparison-chart";
import { DataTable } from "@/components/charts/data-table";
import { FormField } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { EmptyState, ErrorState, LoadingState } from "@/components/page-states";
import { budgetsQuery } from "@/features/budgets/api";
import {
  byEntityQuery,
  executionQuery,
  suggestionsQuery,
  topQuery,
  type ExecutionItem,
} from "@/features/reports/api";
import { formatMoney } from "@/lib/temporal";

const TABS = ["execution", "entities", "top", "suggestions"] as const;
const search = z.object({
  budgetId: z.string().optional(),
  tab: z.enum(TABS).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  dimension: z.enum(["account", "payor", "vendor"]).optional(),
  n: z.union([z.literal(5), z.literal(10), z.literal(20)]).optional(),
});

export const Route = createFileRoute("/_authed/reports")({
  validateSearch: search,
  component: Reports,
});

function Reports() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/reports" });
  const set = (patch: Partial<z.infer<typeof search>>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  const budgets = useQuery(budgetsQuery);
  const budgetId = s.budgetId ?? budgets.data?.[0]?.id;
  const budget = budgets.data?.find((b) => b.id === budgetId);

  return (
    <section aria-labelledby="reports-title" className="grid gap-6">
      <h1 id="reports-title" className="text-2xl font-bold">
        Reports
      </h1>
      {budgets.isPending ? (
        <LoadingState />
      ) : budgets.error ? (
        <ErrorState error={budgets.error} onRetry={() => budgets.refetch()} />
      ) : !budget ? (
        <EmptyState title="No budgets to report on yet" />
      ) : (
        <>
          <form
            role="search"
            aria-label="Report filters"
            className="grid gap-3 sm:grid-cols-3"
            onSubmit={(e) => e.preventDefault()}
          >
            <FormField id="r-budget" label="Budget">
              {(a) => (
                <NativeSelect
                  {...a}
                  value={budget.id}
                  onChange={(e) => set({ budgetId: e.target.value })}
                >
                  {budgets.data.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.currency})
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <FormField id="r-from" label="From">
              {(a) => (
                <Input
                  {...a}
                  type="date"
                  value={s.from ?? ""}
                  onChange={(e) => set({ from: e.target.value || undefined })}
                />
              )}
            </FormField>
            <FormField id="r-to" label="To">
              {(a) => (
                <Input
                  {...a}
                  type="date"
                  value={s.to ?? ""}
                  onChange={(e) => set({ to: e.target.value || undefined })}
                />
              )}
            </FormField>
          </form>
          <Tabs
            value={s.tab ?? "execution"}
            onValueChange={(tab) => set({ tab: tab as (typeof TABS)[number] })}
          >
            <TabsList className="grid h-auto w-full grid-cols-2 sm:flex sm:w-fit">
              <TabsTrigger
                value="execution"
                className="h-auto py-1.5 whitespace-normal sm:whitespace-nowrap"
              >
                Execution
              </TabsTrigger>
              <TabsTrigger
                value="entities"
                className="h-auto py-1.5 whitespace-normal sm:whitespace-nowrap"
              >
                By account, payor, vendor
              </TabsTrigger>
              <TabsTrigger
                value="top"
                className="h-auto py-1.5 whitespace-normal sm:whitespace-nowrap"
              >
                Top N
              </TabsTrigger>
              <TabsTrigger
                value="suggestions"
                className="h-auto py-1.5 whitespace-normal sm:whitespace-nowrap"
              >
                Suggestions
              </TabsTrigger>
            </TabsList>
            <TabsContent value="execution" className="pt-4">
              <ExecutionTab
                budgetId={budget.id}
                currency={budget.currency}
                from={s.from}
                to={s.to}
              />
            </TabsContent>
            <TabsContent value="entities" className="pt-4">
              <EntitiesTab
                budgetId={budget.id}
                currency={budget.currency}
                from={s.from}
                to={s.to}
                dimension={s.dimension ?? "account"}
                onDimension={(d) => set({ dimension: d })}
              />
            </TabsContent>
            <TabsContent value="top" className="pt-4">
              <TopTab
                budgetId={budget.id}
                currency={budget.currency}
                n={s.n ?? 5}
                onN={(n) => set({ n })}
              />
            </TabsContent>
            <TabsContent value="suggestions" className="pt-4">
              <SuggestionsTab budgetId={budget.id} currency={budget.currency} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </section>
  );
}

function ExecutionTab({
  budgetId,
  currency,
  from,
  to,
}: {
  budgetId: string;
  currency: string;
  from?: string;
  to?: string;
}) {
  const { data, isPending, error, refetch } = useQuery(executionQuery(budgetId, from, to));
  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  const m = (v: string) => formatMoney(v, currency);
  const t = data.totals;
  return (
    <div className="grid gap-8">
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted-foreground">Projected income</dt>
          <dd className="text-xl font-semibold">{m(t.projectedIncome)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Projected expenses</dt>
          <dd className="text-xl font-semibold">{m(t.projectedExpense)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Projected net at budget end</dt>
          <dd className="text-xl font-semibold">
            {Number(t.projectedNet) >= 0 ? (
              <PositiveMark>{m(t.projectedNet)}</PositiveMark>
            ) : (
              m(t.projectedNet)
            )}
          </dd>
        </div>
      </dl>
      {(["INCOME", "EXPENSE"] as const).map((type) => {
        const items = data.categories
          .filter((c) => c.type === type)
          .flatMap((c) => c.items.map((i) => ({ ...i, category: c.name })));
        const title = type === "INCOME" ? "Income" : "Expenses";
        if (items.length === 0) return null;
        return (
          <section key={type} aria-labelledby={`exec-${type}`} className="grid gap-4">
            <h2 id={`exec-${type}`} className="text-lg font-semibold">
              {title}
            </h2>
            <ComparisonChart
              title={`${title}: estimated to date vs actual`}
              currency={currency}
              rows={items.map((i) => ({
                id: i.itemId,
                label: i.itemName,
                estimated: Number(i.estimatedToDate),
                actual: Number(i.actual),
              }))}
              summary={`${title} for ${items.length} items. The table below lists every value.`}
            />
            {/* FR-046: execution by category */}
            <DataTable
              label={`${title} by category`}
              rows={data.categories.filter((c) => c.type === type)}
              rowKey={(c) => c.id}
              columns={[
                { key: "c", header: "Category", cell: (c) => c.name },
                {
                  key: "e",
                  header: "Estimated to date",
                  numeric: true,
                  cell: (c) => m(c.subtotal.estimatedToDate),
                },
                { key: "a", header: "Actual", numeric: true, cell: (c) => m(c.subtotal.actual) },
                {
                  key: "p",
                  header: "Projected total",
                  numeric: true,
                  cell: (c) => m(c.subtotal.projected),
                },
              ]}
            />
            <DataTable<ExecutionItem & { category: string }>
              label={`${title} execution`}
              rows={items}
              rowKey={(i) => i.itemId}
              columns={[
                { key: "c", header: "Category", cell: (i) => i.category },
                { key: "n", header: "Item", cell: (i) => i.itemName },
                {
                  key: "e",
                  header: "Estimated to date",
                  numeric: true,
                  cell: (i) => m(i.estimatedToDate),
                },
                { key: "a", header: "Actual", numeric: true, cell: (i) => m(i.actual) },
                {
                  key: "r",
                  header: "Actual / estimated",
                  numeric: true,
                  cell: (i) => `${Math.round(i.ratio * 100)}%`,
                },
                { key: "p", header: "Projected total", numeric: true, cell: (i) => m(i.projected) },
              ]}
            />
          </section>
        );
      })}
      <p className="text-sm text-muted-foreground">
        The projected total adds the unpaid remaining estimates, scaled by how each item has
        performed in past periods. Date filters change the estimated and actual columns only.
      </p>
    </div>
  );
}

function EntitiesTab(props: {
  budgetId: string;
  currency: string;
  from?: string;
  to?: string;
  dimension: "account" | "payor" | "vendor";
  onDimension: (d: "account" | "payor" | "vendor") => void;
}) {
  const { data, isPending, error, refetch } = useQuery(
    byEntityQuery(props.dimension, props.budgetId, props.from, props.to),
  );
  const m = (v: string) => formatMoney(v, props.currency);
  return (
    <div className="grid gap-4">
      <FormField id="r-dimension" label="Group by" className="grid max-w-xs gap-1.5">
        {(a) => (
          <NativeSelect
            {...a}
            value={props.dimension}
            onChange={(e) => props.onDimension(e.target.value as "account" | "payor" | "vendor")}
          >
            <option value="account">Account</option>
            <option value="payor">Payor</option>
            <option value="vendor">Vendor</option>
          </NativeSelect>
        )}
      </FormField>
      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title="No transactions for this selection" />
      ) : (
        <DataTable
          label={`Totals by ${props.dimension}`}
          rows={data}
          rowKey={(r) => r.id}
          columns={[
            {
              key: "n",
              header: props.dimension[0]!.toUpperCase() + props.dimension.slice(1),
              cell: (r) => r.name,
            },
            { key: "i", header: "Income", numeric: true, cell: (r) => m(r.income) },
            { key: "e", header: "Expenses", numeric: true, cell: (r) => m(r.expense) },
          ]}
        />
      )}
    </div>
  );
}

function TopTab({
  budgetId,
  currency,
  n,
  onN,
}: {
  budgetId: string;
  currency: string;
  n: 5 | 10 | 20;
  onN: (n: 5 | 10 | 20) => void;
}) {
  const { data, isPending, error, refetch } = useQuery(topQuery(budgetId, n));
  return (
    <div className="grid gap-4">
      <FormField id="r-n" label="Show top" className="grid max-w-xs gap-1.5">
        {(a) => (
          <NativeSelect
            {...a}
            value={n}
            onChange={(e) => onN(Number(e.target.value) as 5 | 10 | 20)}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </NativeSelect>
        )}
      </FormField>
      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {(["income", "expense"] as const).map((k) => (
            <section key={k} aria-labelledby={`top-${k}`} className="grid gap-2">
              <h2 id={`top-${k}`} className="text-lg font-semibold">
                Top {k === "income" ? "income" : "expenses"}
              </h2>
              {data[k].length === 0 ? (
                <p className="text-muted-foreground">Nothing recorded yet.</p>
              ) : (
                <ol className="grid gap-1">
                  {data[k].map((r, i) => (
                    <li key={r.itemId} className="flex justify-between gap-3 border-b py-1">
                      <span>
                        {i + 1}. {r.itemName}{" "}
                        <span className="text-sm text-muted-foreground">({r.categoryName})</span>
                      </span>
                      <span className="tabular-nums">{formatMoney(r.actual, currency)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionsTab({ budgetId, currency }: { budgetId: string; currency: string }) {
  const { data, isPending, error, refetch } = useQuery(suggestionsQuery(budgetId));
  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  return (
    <div className="grid gap-8">
      <section aria-labelledby="sugg-title" className="grid gap-2">
        <h2 id="sugg-title" className="text-lg font-semibold">
          Suggestions
        </h2>
        <ul className="grid list-disc gap-2 pl-5">
          {data.suggestions.map((sg, i) => (
            <li key={`${sg.rule}-${sg.itemId ?? i}`}>{sg.message}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="rec-title" className="grid gap-2">
        <h2 id="rec-title" className="text-lg font-semibold">
          Recommended estimates for your next budget
        </h2>
        {data.recommendations.length === 0 ? (
          <p className="text-muted-foreground">
            Recommendations appear once some periods have closed.
          </p>
        ) : (
          <DataTable
            label="Recommended estimates"
            rows={data.recommendations}
            rowKey={(r) => r.itemId}
            columns={[
              { key: "n", header: "Item", cell: (r) => r.itemName },
              {
                key: "a",
                header: "Average per period",
                numeric: true,
                cell: (r) => formatMoney(r.recommendedAmount, currency),
              },
            ]}
          />
        )}
      </section>
    </div>
  );
}
