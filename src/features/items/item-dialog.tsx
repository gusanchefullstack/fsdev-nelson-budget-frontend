import { useState, type ReactElement } from "react";
import { toast } from "sonner";
import { FormDialog } from "@/components/form-dialog";
import { errorMessage } from "@/lib/error-messages";
import { ItemForm } from "./item-form";
import { useSaveItem, type Item } from "./api";

type Props = {
  categoryId: string;
  budget: { startDate: string; endDate: string; currency: string };
  item?: Item;
  trigger: ReactElement;
};

export function ItemDialog({ categoryId, budget, item, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const save = useSaveItem(categoryId);
  return (
    <FormDialog
      wide
      title={item ? `Edit ${item.name}` : "New budget item"}
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
    >
      <ItemForm
        key={open ? "open" : "closed"}
        budget={budget}
        item={item}
        pending={save.isPending}
        onSubmit={(data, setServerErrors) =>
          save.mutate(
            { id: item?.id, ...data },
            {
              onSuccess: (res) => {
                // Clamped dates are reported back as notices (FR-013).
                res.notices?.forEach((n) => toast.info(n.message));
                toast.success(item ? "Item saved." : "Item added.");
                setOpen(false);
              },
              onError: (err) => {
                setServerErrors(err);
                toast.error(errorMessage(err));
              },
            },
          )
        }
      />
    </FormDialog>
  );
}
