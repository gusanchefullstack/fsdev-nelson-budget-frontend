import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { ErrorState, LoadingState } from "@/components/page-states";
import { TransactionForm } from "@/features/transactions/transaction-form";
import {
  transactionQuery,
  useDeleteTransaction,
  useSaveTransaction,
} from "@/features/transactions/api";
import { errorMessage } from "@/lib/error-messages";
import { formatDateTime, formatMoney } from "@/lib/temporal";

export const Route = createFileRoute("/_authed/transactions/$id")({ component: EditTransaction });

function EditTransaction() {
  const { id } = Route.useParams();
  const { data: tx, isPending, error, refetch } = useQuery(transactionQuery(id));
  const save = useSaveTransaction();
  const remove = useDeleteTransaction();
  const navigate = useNavigate();
  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  return (
    <article aria-labelledby="tx-title" className="grid gap-6">
      <p>
        <Link to="/transactions">← All transactions</Link>
      </p>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="tx-title" className="text-2xl font-bold">
            {tx.itemName}: {formatMoney(tx.amount, tx.currency)}
          </h1>
          <p className="text-muted-foreground">
            {formatDateTime(tx.occurredAt, tx.timezone)} ({tx.timezone.replaceAll("_", " ")}) ·{" "}
            {tx.budgetName}
          </p>
        </div>
        <ConfirmDeleteDialog
          title="Delete this transaction?"
          pending={remove.isPending}
          onConfirm={() =>
            remove.mutate(tx.id, {
              onSuccess: () => {
                toast.success("Transaction deleted.");
                void navigate({ to: "/transactions" });
              },
              onError: (err) => toast.error(errorMessage(err)),
            })
          }
          trigger={<Button variant="destructive">Delete</Button>}
        />
      </header>
      <TransactionForm
        key={tx.id}
        timezone={tx.timezone}
        transaction={tx}
        pending={save.isPending}
        onSubmit={(data, setServerErrors) =>
          save.mutate(
            { id: tx.id, ...data },
            {
              onSuccess: () => toast.success("Transaction saved."),
              onError: (err) => {
                setServerErrors(err);
                toast.error(errorMessage(err));
              },
            },
          )
        }
      />
    </article>
  );
}
