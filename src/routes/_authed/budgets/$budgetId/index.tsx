import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { FormDialog } from "@/components/form-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/page-states";
import { BudgetForm } from "@/features/budgets/budget-form";
import { CategoryDialog } from "@/features/budgets/category-dialog";
import { BudgetOverview } from "@/features/budgets/overview/budget-overview";
import {
  budgetQuery,
  useDeleteBudget,
  useDeleteCategory,
  useUpdateBudget,
  type BudgetDetail,
  type Category,
  type CategoryType,
} from "@/features/budgets/api";
import { FREQUENCY_LABELS, useDeleteItem } from "@/features/items/api";
import { ItemDialog } from "@/features/items/item-dialog";
import { errorMessage } from "@/lib/error-messages";
import { formatDate, formatMoney } from "@/lib/temporal";

export const Route = createFileRoute("/_authed/budgets/$budgetId/")({ component: BudgetPage });

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

function BudgetPage() {
  const { budgetId } = Route.useParams();
  const { data, isPending, error, refetch } = useQuery(budgetQuery(budgetId));
  if (isPending) return <LoadingState label="Loading budget" />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  return (
    <article aria-labelledby="budget-title" className="grid gap-8">
      <BudgetHeader budget={data} />
      <BudgetOverview budget={data} />
      <CategorySection budget={data} type="INCOME" title="Income" />
      <CategorySection budget={data} type="EXPENSE" title="Expenses" />
    </article>
  );
}

function BudgetHeader({ budget }: { budget: BudgetDetail }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateBudget(budget.id);
  const remove = useDeleteBudget();
  const navigate = useNavigate();
  const { counts } = budget;
  return (
    <header className="grid gap-3">
      <p>
        <Link to="/budgets">← All budgets</Link>
      </p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 id="budget-title" className="text-2xl font-bold">
            {budget.name}
          </h1>
          <p className="text-muted-foreground">
            {budget.currency} · {formatDate(budget.startDate)} – {formatDate(budget.endDate)}
          </p>
          {budget.description && <p>{budget.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <FormDialog
            wide
            title="Edit budget"
            open={editing}
            onOpenChange={setEditing}
            trigger={<Button variant="outline">Edit budget</Button>}
          >
            <BudgetForm
              initial={budget}
              currencyLocked={counts.items > 0}
              submitLabel="Save budget"
              pending={update.isPending}
              onSubmit={(data, setServerErrors) =>
                update.mutate(data, {
                  onSuccess: () => {
                    toast.success("Budget saved.");
                    setEditing(false);
                  },
                  onError: (err) => {
                    setServerErrors(err);
                    toast.error(errorMessage(err));
                  },
                })
              }
            />
          </FormDialog>
          <ConfirmDeleteDialog
            title={`Delete ${budget.name}?`}
            willDelete={[
              plural(counts.categories, "category", "categories"),
              plural(counts.items, "item"),
              plural(counts.transactions, "transaction"),
            ]}
            pending={remove.isPending}
            onConfirm={() =>
              remove.mutate(budget.id, {
                onSuccess: () => {
                  toast.success("Budget deleted.");
                  void navigate({ to: "/budgets" });
                },
                onError: (err) => toast.error(errorMessage(err)),
              })
            }
            trigger={<Button variant="destructive">Delete budget</Button>}
          />
        </div>
      </div>
    </header>
  );
}

function CategorySection({
  budget,
  type,
  title,
}: {
  budget: BudgetDetail;
  type: CategoryType;
  title: string;
}) {
  const categories = budget.categories.filter((c) => c.type === type);
  const headingId = `section-${type}`;
  return (
    <section aria-labelledby={headingId} className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="text-xl font-semibold">
          {title}
        </h2>
        <CategoryDialog
          budgetId={budget.id}
          type={type}
          trigger={
            <Button variant="outline">
              <PlusIcon aria-hidden="true" /> Add {type === "INCOME" ? "income" : "expense"}{" "}
              category
            </Button>
          }
        />
      </div>
      {categories.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()} categories yet`} />
      ) : (
        categories.map((c) => <CategoryCard key={c.id} budget={budget} category={c} />)
      )}
    </section>
  );
}

function CategoryCard({ budget, category }: { budget: BudgetDetail; category: Category }) {
  const removeCategory = useDeleteCategory();
  const removeItem = useDeleteItem();
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>
            <h3>{category.name}</h3>
          </CardTitle>
          {category.description && (
            <p className="text-sm text-muted-foreground">{category.description}</p>
          )}
        </div>
        <div className="flex gap-1">
          <CategoryDialog
            budgetId={budget.id}
            type={category.type}
            category={category}
            trigger={
              <Button variant="ghost" size="icon" aria-label={`Edit category ${category.name}`}>
                <PencilIcon aria-hidden="true" />
              </Button>
            }
          />
          <ConfirmDeleteDialog
            title={`Delete category ${category.name}?`}
            willDelete={[
              plural(category.counts.items, "item"),
              plural(category.counts.transactions, "transaction"),
            ]}
            onConfirm={() =>
              removeCategory.mutate(category.id, {
                onSuccess: () => toast.success("Category deleted."),
                onError: (err) => toast.error(errorMessage(err)),
              })
            }
            trigger={
              <Button variant="ghost" size="icon" aria-label={`Delete category ${category.name}`}>
                <Trash2Icon aria-hidden="true" />
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {category.items.length > 0 && (
          <Table label={`${category.name} items`}>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Item</TableHead>
                <TableHead scope="col">Frequency</TableHead>
                <TableHead scope="col" className="text-right">
                  Estimated
                </TableHead>
                <TableHead scope="col">Dates</TableHead>
                <TableHead scope="col">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {category.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      to="/budgets/$budgetId/items/$itemId"
                      params={{ budgetId: budget.id, itemId: item.id }}
                    >
                      {item.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {FREQUENCY_LABELS[item.frequency].replace(
                      "N",
                      String(item.customInterval ?? "N"),
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(item.estimatedAmount, item.currency)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(item.startDate)} – {formatDate(item.endDate)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <ItemDialog
                      categoryId={category.id}
                      budget={budget}
                      item={item}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={`Edit item ${item.name}`}>
                          <PencilIcon aria-hidden="true" />
                        </Button>
                      }
                    />
                    <ConfirmDeleteDialog
                      title={`Delete item ${item.name}?`}
                      willDelete={[plural(item.transactionCount, "transaction")]}
                      onConfirm={() =>
                        removeItem.mutate(item.id, {
                          onSuccess: () => toast.success("Item deleted."),
                          onError: (err) => toast.error(errorMessage(err)),
                        })
                      }
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={`Delete item ${item.name}`}>
                          <Trash2Icon aria-hidden="true" />
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <ItemDialog
          categoryId={category.id}
          budget={budget}
          trigger={
            <Button variant="outline" className="justify-self-start">
              <PlusIcon aria-hidden="true" /> Add item to {category.name}
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
