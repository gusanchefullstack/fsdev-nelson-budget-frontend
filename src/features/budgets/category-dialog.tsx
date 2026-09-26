import { useState, type ReactElement } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/form-dialog";
import { FormField } from "@/components/form-field";
import { errorMessage } from "@/lib/error-messages";
import { useZodForm } from "@/lib/forms";
import { useSaveCategory, type Category, type CategoryType } from "./api";
import { categorySchema } from "./schemas";

type Props = { budgetId: string; type: CategoryType; category?: Category; trigger: ReactElement };

export function CategoryDialog({ budgetId, type, category, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const save = useSaveCategory(budgetId);
  const form = useZodForm(categorySchema, {
    type: category?.type ?? type,
    name: category?.name ?? "",
    description: category?.description ?? "",
  });
  const noun = type === "INCOME" ? "income" : "expense";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = form.validate();
    if (!data) return;
    save.mutate(
      { id: category?.id, ...data, description: data.description || null },
      {
        onSuccess: () => {
          toast.success(category ? "Category saved." : "Category added.");
          setOpen(false);
          if (!category) form.setValues({ type, name: "", description: "" });
        },
        onError: (err) => {
          form.applyServerErrors(err);
          toast.error(errorMessage(err));
        },
      },
    );
  }

  return (
    <FormDialog
      title={category ? `Edit ${category.name}` : `New ${noun} category`}
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        <FormField
          id={`cat-name-${category?.id ?? type}`}
          label="Name"
          required
          error={form.errors.name}
        >
          {(a) => (
            <Input
              {...a}
              value={form.values.name}
              onChange={(e) => form.set("name")(e.target.value)}
            />
          )}
        </FormField>
        <FormField
          id={`cat-desc-${category?.id ?? type}`}
          label="Description"
          error={form.errors.description}
        >
          {(a) => (
            <Textarea
              {...a}
              value={form.values.description}
              onChange={(e) => form.set("description")(e.target.value)}
            />
          )}
        </FormField>
        <Button type="submit" disabled={save.isPending} className="justify-self-start">
          {category ? "Save category" : "Add category"}
        </Button>
      </form>
    </FormDialog>
  );
}
