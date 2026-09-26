import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authed/budgets/new/")({ component: NewBudget });

// FR-016 — creation modes
const MODES = [
  {
    to: "/budgets/new/lite",
    title: "Lite",
    text: "Start with the basics (name, currency, dates) and add categories and items later.",
  },
  {
    to: "/budgets/new/guided",
    title: "Guided",
    text: "Step by step: basic info, then income and expense categories and items, then review.",
  },
] as const;

function NewBudget() {
  return (
    <section aria-labelledby="new-budget-title" className="grid gap-6">
      <h1 id="new-budget-title" className="text-2xl font-bold">
        New budget
      </h1>
      <ul className="grid gap-4 md:grid-cols-3">
        {MODES.map((m) => (
          <li key={m.to}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>
                  <Link to={m.to}>{m.title}</Link>
                </CardTitle>
                <CardDescription>{m.text}</CardDescription>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
