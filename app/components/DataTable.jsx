"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Select2 from "@/app/components/Select2";

function getCellValue(row, column) {
  if (typeof column.sortValue === "function") return column.sortValue(row);
  if (typeof column.accessor === "function") return column.accessor(row);
  if (column.key) return row[column.key];
  return "";
}

function defaultCompare(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  const aNum = Number(a);
  const bNum = Number(b);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;

  return String(a).localeCompare(String(b), "tr", { sensitivity: "base" });
}

export default function DataTable({
  columns = [],
  rows = [],
  rowKey = "id",
  emptyText = "Kayıt bulunamadı.",
  defaultPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  enableSearch = false,
  searchPlaceholder = "Ara...",
  searchableKeys = [],
  onRowClick,
}) {
  const firstSortable = columns.find((c) => c.sortable !== false)?.key || null;
  const [sortKey, setSortKey] = useState(firstSortable);
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [searchQuery, setSearchQuery] = useState("");

  const searchedRows = useMemo(() => {
    if (!enableSearch || !searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();

    return rows.filter((row) => {
      const values =
        searchableKeys.length > 0
          ? searchableKeys.map((key) => row?.[key])
          : Object.values(row || {});

      return values
        .filter((v) => v !== null && v !== undefined)
        .map((v) => String(v).toLowerCase())
        .some((v) => v.includes(q));
    });
  }, [enableSearch, rows, searchQuery, searchableKeys]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return searchedRows;
    const column = columns.find((c) => c.key === sortKey);
    if (!column) return searchedRows;

    const list = [...searchedRows];
    list.sort((a, b) => {
      const compared = defaultCompare(getCellValue(a, column), getCellValue(b, column));
      return sortDir === "asc" ? compared : -compared;
    });
    return list;
  }, [columns, searchedRows, sortDir, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = sortedRows.slice(startIndex, startIndex + pageSize);
  const pageSizeSelectOptions = useMemo(
    () =>
      pageSizeOptions.map((size) => ({
        value: String(size),
        label: `${size} / sayfa`,
      })),
    [pageSizeOptions]
  );

  const onSort = (column) => {
    if (column.sortable === false || !column.key) return;
    if (sortKey === column.key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(column.key);
    setSortDir("asc");
  };

  return (
    <div className="space-y-3">
      {enableSearch ? (
        <div className="ta-card p-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>
        </div>
      ) : null}

      <div className="ta-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column) => {
                const isSorted = sortKey === column.key;
                return (
                  <th
                    key={column.key || column.header}
                    className={[
                      "text-left py-2.5 px-3 text-xs font-semibold text-gray-500",
                      column.sortable === false ? "" : "cursor-pointer select-none",
                      column.headerClassName || "",
                    ].join(" ")}
                    onClick={() => onSort(column)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {column.header}
                      {isSorted ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-sm text-slate-500"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              pageRows.map((row, rowIndex) => (
                <tr
                  key={typeof rowKey === "function" ? rowKey(row) : row[rowKey] || rowIndex}
                  className={[
                    "border-b border-gray-100 last:border-b-0 hover:bg-gray-50",
                    typeof onRowClick === "function" ? "cursor-pointer" : "",
                  ].join(" ")}
                  onClick={() => {
                    if (typeof onRowClick === "function") onRowClick(row);
                  }}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key || column.header}
                      className={["py-2.5 px-3 text-gray-700", column.className || ""].join(" ")}
                    >
                      {typeof column.render === "function"
                        ? column.render(row, rowIndex, startIndex + rowIndex + 1)
                        : getCellValue(row, column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-slate-500">
            Toplam {sortedRows.length} kayıt • Sayfa {currentPage}/{totalPages}
          </div>
          <div className="flex items-center gap-2">
            <div className="min-w-[120px]">
              <Select2
                name="pageSize"
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                options={pageSizeSelectOptions}
                isSearchable={false}
              />
            </div>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              className="text-xs border border-gray-300 rounded-md px-2 py-1 disabled:opacity-40"
            >
              Geri
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="text-xs border border-gray-300 rounded-md px-2 py-1 disabled:opacity-40"
            >
              İleri
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
