import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { errorMessage } from "@/lib/error-messages";
import { formatMoney } from "@/lib/temporal";
import {
  PARTY_META,
  partiesQuery,
  partyQuery,
  useDeleteParty,
  useSaveParty,
  type Collection,
} from "./api";
import { PartyForm } from "./party-form";

export function PartyListPage({ collection }: { collection: Collection }) {
  const meta = PARTY_META[collection];
  const { data, isPending, error, refetch } = useQuery(partiesQuery(collection));
  const [open, setOpen] = useState(false);
  const save = useSaveParty(collection);
  const isAccount = collection === "accounts";

  return (
    <section aria-labelledby="parties-title" className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 id="parties-title" className="text-2xl font-bold">
            {meta.title}
          </h1>
          <p className="text-muted-foreground">{meta.intro}</p>
        </div>
        <FormDialog
          wide
          title={`New ${meta.singular}`}
          open={open}
          onOpenChange={setOpen}
          trigger={<Button>New {meta.singular}</Button>}
        >
          <PartyForm
            key={open ? "open" : "closed"}
            collection={collection}
            pending={save.isPending}
            onSubmit={(data, setServerErrors) =>
              save.mutate(data, {
                onSuccess: () => {
                  toast.success(
                    `${meta.singular[0]!.toUpperCase()}${meta.singular.slice(1)} added.`,
                  );
                  setOpen(false);
                },
                onError: (err) => {
                  setServerErrors(err);
                  toast.error(errorMessage(err));
                },
              })
            }
          />
        </FormDialog>
      </div>
      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title={`No ${meta.title.toLowerCase()} yet`}>{meta.intro}</EmptyState>
      ) : (
        <Table label={meta.title}>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">Type</TableHead>
              <TableHead scope="col">Currency</TableHead>
              {isAccount && (
                <TableHead scope="col" className="text-right">
                  Current balance
                </TableHead>
              )}
              <TableHead scope="col" className="text-right">
                Transactions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link to={`/${collection}/$id` as "/accounts/$id"} params={{ id: p.id }}>
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell>{meta.types[p.type] ?? p.type}</TableCell>
                <TableCell>{p.currency}</TableCell>
                {isAccount && (
                  <TableCell className="text-right">
                    {formatMoney(p.currentBalance ?? 0, p.currency)}
                  </TableCell>
                )}
                <TableCell className="text-right">{p.transactionCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

export function PartyDetailPage({ collection, id }: { collection: Collection; id: string }) {
  const meta = PARTY_META[collection];
  const { data: party, isPending, error, refetch } = useQuery(partyQuery(collection, id));
  const save = useSaveParty(collection);
  const remove = useDeleteParty(collection);
  const navigate = useNavigate();

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <article aria-labelledby="party-title" className="grid max-w-3xl gap-6">
      <p>
        <Link to={`/${collection}` as "/accounts"}>← All {meta.title.toLowerCase()}</Link>
      </p>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="party-title" className="text-2xl font-bold">
            {party.name}
          </h1>
          <p className="text-muted-foreground">
            {meta.types[party.type]} · {party.currency}
            {party.currentBalance !== undefined && (
              <> · Current balance {formatMoney(party.currentBalance, party.currency)}</>
            )}{" "}
            · Used by {party.transactionCount} transaction{party.transactionCount === 1 ? "" : "s"}
          </p>
        </div>
        <ConfirmDeleteDialog
          title={`Delete ${party.name}?`}
          pending={remove.isPending}
          onConfirm={() =>
            remove.mutate(party.id, {
              onSuccess: () => {
                toast.success("Deleted.");
                void navigate({ to: `/${collection}` as "/accounts" });
              },
              onError: (err) => toast.error(errorMessage(err)),
            })
          }
          trigger={<Button variant="destructive">Delete</Button>}
        />
      </header>
      <section aria-labelledby="edit-title" className="grid gap-4">
        <h2 id="edit-title" className="text-lg font-semibold">
          Details
        </h2>
        <PartyForm
          collection={collection}
          party={party}
          pending={save.isPending}
          onSubmit={(data, setServerErrors) =>
            save.mutate(
              { id: party.id, ...data },
              {
                onSuccess: () => toast.success("Saved."),
                onError: (err) => {
                  setServerErrors(err);
                  toast.error(errorMessage(err));
                },
              },
            )
          }
        />
      </section>
    </article>
  );
}
