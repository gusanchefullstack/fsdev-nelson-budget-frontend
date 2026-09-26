import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type Column<T> = {
  key: string;
  header: string;
  numeric?: boolean;
  cell: (row: T) => ReactNode;
};

/** The accessible table alternative shown with every chart (FR-050). */
export function DataTable<T>({
  label,
  columns,
  rows,
  rowKey,
}: {
  label: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}) {
  return (
    <Table label={label}>
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c.key} scope="col" className={c.numeric ? "text-right" : undefined}>
              {c.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={rowKey(row)}>
            {columns.map((c) => (
              <TableCell key={c.key} className={c.numeric ? "text-right tabular-nums" : undefined}>
                {c.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
