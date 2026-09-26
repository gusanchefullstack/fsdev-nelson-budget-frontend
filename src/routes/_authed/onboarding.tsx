import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { budgetsQuery } from "@/features/budgets/api";
import { partiesQuery } from "@/features/parties/api";
import { useUpdateProfile } from "@/features/profile/api";
import { errorMessage } from "@/lib/error-messages";

export const Route = createFileRoute("/_authed/onboarding")({ component: Onboarding });

// FR-060: first-time guide to create an account, a payor, a vendor and a budget.
function Onboarding() {
  const accounts = useQuery(partiesQuery("accounts"));
  const payors = useQuery(partiesQuery("payors"));
  const vendors = useQuery(partiesQuery("vendors"));
  const budgets = useQuery(budgetsQuery);
  const update = useUpdateProfile();
  const navigate = useNavigate();

  const steps = [
    {
      done: (accounts.data?.length ?? 0) > 0,
      to: "/accounts",
      label: "Add an account",
      hint: "Where your money is: checking, savings, cash…",
    },
    {
      done: (payors.data?.length ?? 0) > 0,
      to: "/payors",
      label: "Add a payor",
      hint: "Who pays you, like your employer.",
    },
    {
      done: (vendors.data?.length ?? 0) > 0,
      to: "/vendors",
      label: "Add a vendor",
      hint: "Who you pay, like your landlord or utilities.",
    },
    {
      done: (budgets.data?.length ?? 0) > 0,
      to: "/budgets/new",
      label: "Create a budget",
      hint: "Plan your income and expenses for a period.",
    },
  ] as const;
  const done = steps.filter((s) => s.done).length;

  function finish(onboardingStatus: "COMPLETED" | "SKIPPED") {
    update.mutate(
      { onboardingStatus },
      {
        onSuccess: () => void navigate({ to: "/" }),
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  }

  return (
    <section aria-labelledby="onboarding-title" className="grid max-w-2xl gap-6">
      <div className="grid gap-2">
        <h1 id="onboarding-title" className="text-2xl font-bold">
          Welcome to Nelson
        </h1>
        <p className="text-muted-foreground">
          Four quick steps get you ready to track your budget. You can do them in any order.
        </p>
      </div>
      <div className="grid gap-1">
        <label htmlFor="onboarding-progress" className="text-sm font-medium">
          {done} of {steps.length} done
        </label>
        <progress
          id="onboarding-progress"
          max={steps.length}
          value={done}
          className="h-2 w-full accent-[var(--primary)]"
        />
      </div>
      <ol className="grid gap-3">
        {steps.map((s) => (
          <li key={s.to} className="flex items-start gap-3 rounded-lg border p-4">
            {s.done ? (
              <CheckCircle2Icon
                className="mt-0.5 size-5 shrink-0 text-success"
                aria-hidden="true"
              />
            ) : (
              <CircleIcon
                className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            <div className="grid gap-0.5">
              <Link to={s.to}>
                {s.label}
                <span className="sr-only">{s.done ? " (done)" : " (to do)"}</span>
              </Link>
              <span className="text-sm text-muted-foreground">{s.hint}</span>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => finish("COMPLETED")} disabled={update.isPending}>
          {done === steps.length ? "Finish" : "I'm done"}
        </Button>
        <Button variant="outline" onClick={() => finish("SKIPPED")} disabled={update.isPending}>
          Skip for now
        </Button>
      </div>
    </section>
  );
}
