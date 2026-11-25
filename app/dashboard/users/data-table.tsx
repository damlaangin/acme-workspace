"use client";

import { useState } from "react";
import styles from "@/styles/ui/DataTable.module.scss";
import TableFooter from "@/components/app/dashboard/table-footer";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUp, ArrowDown } from "lucide-react";

type TableColumnMeta = {
  cellClassName?: string;
  headerClassName?: string;
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onSortChange: (sorting: { field: string; direction: "ASC" | "DESC" }) => void;
  changeRowLimit: (limit: number) => void;
  currentPageSize: number;
  totalRows: number;
  nextPage: () => void;
  prevPage: () => void;
  page?: number;
  onPageSelect?: (page: number) => void;
  isLoading: boolean;
  readableLayout?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onSortChange,
  changeRowLimit,
  currentPageSize,
  totalRows,
  nextPage,
  prevPage,
  page,
  onPageSelect,
  isLoading,
  readableLayout = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const hiddenColumns = ["pfp", "actions"];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const skeletonRows = Array(3).fill(null);

  return (
    <div>
      <div className={styles["table-wrapper"]}>
        <div className={styles["table-container"]}>
          <Table
            className={`${styles["table-grid"]} ${
              readableLayout ? styles["table-grid--readable"] : ""
            }`}
          >
            <TableHeader
              className={`${styles["table-header"]} ${styles["table-grid-header"]} ${
                readableLayout ? styles["table-grid-header--readable"] : ""
              }`}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className={styles["table-grid-row"]}
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={`${styles["table-grid-head"]} ${
                        header.column.id === "actions"
                          ? styles["table-grid-head--actions"]
                          : ""
                      } ${readableLayout ? styles["table-grid-head--readable"] : ""} ${
                        (header.column.columnDef.meta as TableColumnMeta | undefined)
                          ?.headerClassName ?? ""
                      }`}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          className={styles["btn-header"]}
                          disabled={!header.column.getCanSort()}
                          onClick={() => {
                            if (!header.column.getCanSort()) return;

                            const currentSort = sorting.find(
                              (s) => s.id === header.column.id
                            );
                            const newDirection: "ASC" | "DESC" =
                              currentSort && currentSort.desc ? "ASC" : "DESC";

                            const newSorting = [
                              {
                                id: header.column.id,
                                desc: newDirection === "DESC",
                              },
                            ];

                            setSorting(newSorting);
                            onSortChange({
                              field: header.column.id,
                              direction: newDirection,
                            });
                          }}
                          title={header.column.getCanSort() ? "Toggle Sort" : undefined}
                          type="button"
                        >
                          <span className={styles["column-headings"]}>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          {header.column.getCanSort() &&
                            !hiddenColumns.includes(header.column.id) && (
                              <div className={styles["sort-buttons-container"]}>
                                {sorting.find((s) => s.id === header.column.id)
                                  ?.desc ? (
                                  <ArrowUp className={styles["sort-icon"]} />
                                ) : (
                                  <ArrowDown className={styles["sort-icon"]} />
                                )}
                              </div>
                            )}
                        </button>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody className={styles["table-grid-body"]}>
              {isLoading ? (
                skeletonRows.map((_, index) => (
                  <TableRow key={index} className={styles["table-grid-row"]}>
                    {columns.map((column, columnIndex) => (
                      <TableCell
                        key={column.id ?? `column-${columnIndex}`}
                        className={`${styles["table-grid-cell"]} ${
                          readableLayout ? styles["table-grid-cell--readable"] : ""
                        }`}
                      >
                        <div
                          className={styles["skeleton-box"]}
                          style={{ width: "75%" }}
                        ></div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className={styles["table-grid-row"]}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={`${styles["table-cell"]} ${styles["table-grid-cell"]} ${
                          cell.column.id === "actions"
                            ? styles["table-grid-cell--actions"]
                            : ""
                        } ${readableLayout ? styles["table-grid-cell--readable"] : ""} ${
                          (cell.column.columnDef.meta as TableColumnMeta | undefined)
                            ?.cellClassName ?? ""
                        }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className={styles["table-grid-row"]}>
                  <TableCell
                    colSpan={columns.length}
                    className={`${styles["table-cell-center"]} ${styles["table-grid-cell"]} ${
                      readableLayout ? styles["table-grid-cell--readable"] : ""
                    }`}
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className={styles["mobile-cards"]}>
        {isLoading ? (
          <div className={styles["mobile-card-status"]}>Loading...</div>
        ) : table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const cells = row.getVisibleCells();
            const avatarCell = cells.find((cell) => cell.column.id === "pfp");
            const actionsCell = cells.find((cell) => cell.column.id === "actions");
            const infoCells = cells.filter(
              (cell) => !["pfp", "actions"].includes(cell.column.id)
            );

            return (
              <article key={`mobile-${row.id}`} className={styles["mobile-card"]}>
                <div className={styles["mobile-card-header"]}>
                  <div className={styles["mobile-card-avatar"]}>
                    {avatarCell
                      ? flexRender(
                          avatarCell.column.columnDef.cell,
                          avatarCell.getContext()
                        )
                      : null}
                  </div>
                </div>
                <div className={styles["mobile-card-grid"]}>
                  {infoCells.map((cell) => {
                    const headerLabel =
                      typeof cell.column.columnDef.header === "string"
                        ? cell.column.columnDef.header
                        : cell.column.id;
                    return (
                      <div
                        key={cell.id}
                        className={styles["mobile-card-item"]}
                      >
                        <span className={styles["mobile-card-label"]}>
                          {headerLabel}
                        </span>
                        <span className={styles["mobile-card-value"]}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {actionsCell ? (
                  <div className={styles["mobile-card-actions"]}>
                    {flexRender(
                      actionsCell.column.columnDef.cell,
                      actionsCell.getContext()
                    )}
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className={styles["mobile-card-status"]}>No results.</div>
        )}
      </div>

      <TableFooter
        currentPageSize={currentPageSize}
        totalRows={totalRows}
        changeRowLimit={changeRowLimit}
        nextPage={nextPage}
        prevPage={prevPage}
        page={page}
        onPageSelect={onPageSelect}
      />
    </div>
  );
}
