"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import DataTable from "@/app/components/DataTable";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import Select2 from "@/app/components/Select2";
import DatePicker from "@/app/components/DatePicker";
import { moduleConfigs } from "@/lib/moduleConfigs";
import { fetchModuleList, fetchModuleMetrics } from "@/lib/modulesApi";

function toRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function flattenScalarMetrics(input) {
  const out = {};

  const walk = (obj, prefix = "") => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    Object.entries(obj).forEach(([key, value]) => {
      const k = prefix ? `${prefix}.${key}` : key;
      if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
        out[k] = value;
        return;
      }
      if (typeof value === "object" && !Array.isArray(value)) {
        walk(value, k);
      }
    });
  };

  if (input?.data && typeof input.data === "object" && !Array.isArray(input.data)) {
    walk(input.data);
  } else {
    walk(input);
  }

  return out;
}

function prettifyKey(key) {
  return key
    .replace(/[_\.]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatCell(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Evet" : "Hayır";
  return String(value);
}

function buildDynamicColumns(rows, preferredKeys = []) {
  const sample = rows.find((r) => r && typeof r === "object") || {};
  const allKeys = Object.keys(sample).filter((key) => {
    const v = sample[key];
    return ["string", "number", "boolean"].includes(typeof v) || v === null;
  });

  const prioritized = preferredKeys.filter((k) => allKeys.includes(k));
  const remaining = allKeys.filter((k) => !prioritized.includes(k));
  const keys = [...prioritized, ...remaining].slice(0, 8);

  if (keys.length === 0) {
    return [
      {
        key: "raw",
        header: "Veri",
        sortable: false,
        render: (row) => (
          <pre className="text-xs whitespace-pre-wrap break-words text-slate-700">{JSON.stringify(row, null, 2)}</pre>
        ),
      },
    ];
  }

  return keys.map((key) => ({
    key,
    header: prettifyKey(key),
    render: (row) => formatCell(row?.[key]),
  }));
}

function buildSearchableKeys(rows) {
  const sample = rows.find((r) => r && typeof r === "object") || {};
  return Object.keys(sample).filter((key) => {
    const v = sample[key];
    return ["string", "number", "boolean"].includes(typeof v);
  });
}

const sortOptions = [
  { value: "created_at", label: "created_at" },
  { value: "updated_at", label: "updated_at" },
  { value: "id", label: "id" },
  { value: "status", label: "status" },
];

const sortDirOptions = [
  { value: "desc", label: "desc" },
  { value: "asc", label: "asc" },
];

const perPageOptions = [
  { value: "10", label: "10" },
  { value: "15", label: "15" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
];

export default function ModulePage() {
  const ready = useAuthGuard();
  const router = useRouter();
  const { slug } = useParams();
  const searchParams = useSearchParams();

  const config = useMemo(() => moduleConfigs[slug], [slug]);

  const [rows, setRows] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
    from: searchParams.get("from") || "",
    to: searchParams.get("to") || "",
    sort_by: searchParams.get("sort_by") || "created_at",
    sort_dir: searchParams.get("sort_dir") || "desc",
    per_page: searchParams.get("per_page") || "15",
  });

  useEffect(() => {
    setFilters({
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || "",
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
      sort_by: searchParams.get("sort_by") || "created_at",
      sort_dir: searchParams.get("sort_dir") || "desc",
      per_page: searchParams.get("per_page") || "15",
    });
  }, [searchParams]);

  useEffect(() => {
    if (!ready || !config) return;

    const params = {
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || "",
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
      sort_by: searchParams.get("sort_by") || "created_at",
      sort_dir: searchParams.get("sort_dir") || "desc",
      per_page: searchParams.get("per_page") || "15",
    };

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [listRes, metricsRes] = await Promise.all([fetchModuleList(slug, params), fetchModuleMetrics(slug, params)]);
        setRows(toRows(listRes));
        setMetrics(flattenScalarMetrics(metricsRes));
      } catch (err) {
        setError(err.message || "Modül verileri alınamadı.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [ready, config, slug, searchParams]);

  const metricEntries = useMemo(() => Object.entries(metrics).slice(0, 8), [metrics]);
  const columns = useMemo(() => buildDynamicColumns(rows, config?.columns || []), [rows, config]);
  const searchableKeys = useMemo(() => buildSearchableKeys(rows), [rows]);

  const applyFilters = () => {
    const q = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (!value) return;
      q.set(key, value);
    });
    router.push(`/modules/${slug}${q.toString() ? `?${q.toString()}` : ""}`);
  };

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Yükleniyor...</div>;
  }

  if (!config) {
    return (
      <div className="min-h-screen flex ta-shell">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Navbar />
          <main className="ta-page space-y-4">
            <h1 className="text-2xl font-bold">Modül bulunamadı</h1>
            <p className="text-sm text-slate-500">İlgili sayfa tanımı mevcut değil.</p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex ta-shell">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar />
        <main className="ta-page space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{config.title}</h1>
              <p className="text-sm text-slate-500 mt-1">{config.description}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Dashboard&apos;a Dön
            </button>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="ta-card p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3 items-end">
            <div className="xl:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">search</label>
              <input
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                className="ta-input"
                placeholder="Ara..."
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">status</label>
              <input
                value={filters.status}
                onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                className="ta-input"
                placeholder="status"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">from</label>
              <DatePicker name="from" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">to</label>
              <DatePicker name="to" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">sort_by</label>
              <Select2
                name="sort_by"
                value={filters.sort_by}
                onChange={(e) => setFilters((p) => ({ ...p, sort_by: e.target.value }))}
                options={sortOptions}
                isSearchable
              />
            </div>
            <div className="grid grid-cols-2 gap-2 xl:col-span-1">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">dir</label>
                <Select2
                  name="sort_dir"
                  value={filters.sort_dir}
                  onChange={(e) => setFilters((p) => ({ ...p, sort_dir: e.target.value }))}
                  options={sortDirOptions}
                  isSearchable={false}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">per_page</label>
                <Select2
                  name="per_page"
                  value={filters.per_page}
                  onChange={(e) => setFilters((p) => ({ ...p, per_page: e.target.value }))}
                  options={perPageOptions}
                  isSearchable={false}
                />
              </div>
            </div>
            <div className="xl:col-span-7 flex justify-end">
              <button
                type="button"
                onClick={applyFilters}
                className="inline-flex items-center rounded-lg bg-[#111b3a] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d1630]"
              >
                Filtreleri Uygula
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {metricEntries.length > 0
              ? metricEntries.map(([key, value]) => (
                  <div key={key} className="ta-card p-4">
                    <p className="text-xs text-slate-500">{prettifyKey(key)}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{formatCell(value)}</p>
                  </div>
                ))
              : [1, 2, 3, 4].map((idx) => (
                  <div key={idx} className="ta-card p-4">
                    <p className="text-xs text-slate-500">KPI {idx}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-400">-</p>
                  </div>
                ))}
          </div>

          <div className="ta-card p-4">
            <h2 className="text-base font-semibold">Önerilen Raporlar</h2>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              {config.reports.map((report) => (
                <div key={report} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-slate-50">
                  {report}
                </div>
              ))}
            </div>
          </div>

          <div className="ta-card p-4 space-y-3">
            <h2 className="text-base font-semibold">Kayıtlar</h2>
            {loading ? (
              <p className="text-sm text-slate-500">Yükleniyor...</p>
            ) : (
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id || row.uuid || JSON.stringify(row)}
                emptyText="Kayıt bulunamadı."
                defaultPageSize={10}
                enableSearch
                searchPlaceholder="Kayıt ara..."
                searchableKeys={searchableKeys}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
