import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { TransactionForm } from "@/features/transactions/transaction-form";
import { useSaveTransaction } from "@/features/transactions/api";
import { errorMessage } from "@/lib/error-messages";

export const Route = createFileRoute("/_authed/transactions/new")({
  validateSearch: z.object({ budgetId: z.string().optional() }),
  component: NewTransaction,
});

function NewTransaction() {
  const { user } = Route.useRouteContext();
  const { budgetId } = Route.useSearch();
  const save = useSaveTransaction();
  const navigate = useNavigate();
  return (
    <section aria-labelledby="new-tx-title" className="grid gap-6">
      <h1 id="new-tx-title" className="text-2xl font-bold">
        Record a transaction
      </h1>
      <TransactionForm
        timezone={user.timezone}
        initialBudgetId={budgetId}
        pending={save.isPending}
        onSubmit={(data, setServerErrors) =>
          save.mutate(data, {
            onSuccess: () => {
              toast.success("Transaction recorded.");
              void navigate({ to: "/transactions" });
            },
            onError: (err) => {
              setServerErrors(err);
              toast.error(errorMessage(err));
            },
          })
        }
      />
    </section>
  );
}
