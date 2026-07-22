import type { ReactNode } from "react";
import { NAVY } from "./tokens";

export type TableColumn<T> = {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render: (row: T) => ReactNode;
};

type Props<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  className?: string;
};

/**
 * Table — lightweight data table for admin / list surfaces.
 */
export default function Table<T>({
  columns,
  rows,
  rowKey,
  empty,
  className = "",
}: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className={`rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-500 ${className}`}>
        {empty ?? "データがありません"}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-2xl border border-slate-200 ${className}`}>
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50/80 text-[11px] font-semibold tracking-[0.14em] text-slate-500">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 ${
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                      ? "text-center"
                      : "text-left"
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-slate-100">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3.5 ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left"
                  }`}
                  style={{ color: NAVY }}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
