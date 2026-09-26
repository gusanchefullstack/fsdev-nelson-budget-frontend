import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorState, LoadingState } from "@/components/page-states";
import { FREQUENCY_LABELS, itemQuery, type BucketStatus } from "@/features/items/api";
import { formatDate, formatMoney } from "@/lib/temporal";

export const Route = createFileRoute("/_authed/budgets/$budgetId/items/$itemId")({
  component: ItemPage,
});

const STATUS: Record<
  BucketStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  OPEN: { label: "Open", variant: "outline" },
  CLOSED: { label: "Closed", variant: "secondary" },
  MISSED: { label: "Missed", variant: "destructive" },
};

function ItemPage() {
  const { budgetId, itemId } = Route.useParams();
  const { data: item, isPending, error, refetch } = useQuery(itemQuery(itemId));
  if (isPending) return <LoadingState label="Loading item" />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  return (
    <article aria-labelledby="item-title" className="grid gap-6">
      <p>
        <Link to="/budgets/$budgetId" params={{ budgetId }}>
          ← Back to budget
        </Link>
      </p>
      <header className="grid gap-1">
        <h1 id="item-title" className="text-2xl font-bold">
          {item.name}
        </h1>
        <p className="text-muted-foreground">{item.description}</p>
        <p>
          {item.type === "INCOME" ? "Income" : "Expense"} ·{" "}
          {FREQUENCY_LABELS[item.frequency].replace("N", String(item.customInterval ?? "N"))} ·{" "}
          {formatMoney(item.estimatedAmount, item.currency)} · {formatDate(item.startDate)} –{" "}
          {formatDate(item.endDate)}
        </p>
      </header>
      <Table label={`${item.name} buckets`}>
        <TableCaption>
          Buckets: each expected occurrence and the transactions recorded in its window (
          {item.buckets.length} in total).
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">#</TableHead>
            <TableHead scope="col">Window</TableHead>
            <TableHead scope="col">Expected</TableHead>
            <TableHead scope="col" className="text-right">
              Estimated
            </TableHead>
            <TableHead scope="col" className="text-right">
              Actual
            </TableHead>
            <TableHead scope="col">Last paid</TableHead>
            <TableHead scope="col">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {item.buckets.map((b) => (
            <TableRow key={b.id}>
              <TableCell>{b.sequence}</TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDate(b.startDate)} – {formatDate(b.endDate)}
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatDate(b.expectedDate)}</TableCell>
              <TableCell className="text-right">
                {formatMoney(b.estimatedAmount, b.currency)}
              </TableCell>
              <TableCell className="text-right">
                {formatMoney(b.actualAmount, b.currency)}
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatDate(b.actualDate)}</TableCell>
              <TableCell>
                <Badge variant={STATUS[b.status].variant}>{STATUS[b.status].label}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </article>
  );
}
