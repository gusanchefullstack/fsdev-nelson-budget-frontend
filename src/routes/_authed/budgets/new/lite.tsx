import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BudgetForm } from "@/features/budgets/budget-form";
import { useCreateBudget } from "@/features/budgets/api";
import { errorMessage } from "@/lib/error-messages";

export const Route = createFileRoute("/_authed/budgets/new/lite")({ component: LiteBudget });

function LiteBudget() {
  const create = useCreateBudget();
  const navigate = useNavigate();
  return (
    <section aria-labelledby="lite-title" className="grid max-w-2xl gap-6">
      <h1 id="lite-title" className="text-2xl font-bold">
        New budget (Lite)
      </h1>
      <BudgetForm
        submitLabel="Create budget"
        pending={create.isPending}
        onSubmit={(data, setServerErrors) =>
          create.mutate(data, {
            onSuccess: (b) => {
              toast.success("Budget created.");
              void navigate({ to: "/budgets/$budgetId", params: { budgetId: b.id } });
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
