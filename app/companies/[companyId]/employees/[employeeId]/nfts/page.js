"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, ExternalLink, Link2, WalletCards } from "lucide-react";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import DataTable from "@/app/components/DataTable";
import Select2 from "@/app/components/Select2";
import DatePicker from "@/app/components/DatePicker";
import { listEmployeeNfts } from "@/lib/employees";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import { formatDateTimeDDMMYYYY } from "@/lib/date";

function withinDateRange(dateText, from, to) {
  if (!from && !to) return true;
  if (!dateText) return false;
  const current = new Date(dateText);
  if (Number.isNaN(current.getTime())) return false;

  if (from) {
    const start = new Date(`${from}T00:00:00`);
    if (current < start) return false;
  }

  if (to) {
    const end = new Date(`${to}T23:59:59`);
    if (current > end) return false;
  }

  return true;
}

export default function EmployeeNftsPage() {
  const ready = useAuthGuard();
  const router = useRouter();
  const { companyId, employeeId } = useParams();

  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    dateFrom: "",
    dateTo: "",
  });

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await listEmployeeNfts(companyId, employeeId);
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data.data || [];
        setNfts(list);
      } catch (err) {
        if (!cancelled) setError(err.message || "NFT listesi alınamadı");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [ready, companyId, employeeId]);

  const statusBadge = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-700",
      sending: "bg-blue-100 text-blue-700",
      queued: "bg-blue-100 text-blue-700",
      sent: "bg-green-100 text-green-700",
      minted: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      mint_failed: "bg-red-100 text-red-700",
    };

    const key = String(status || "").toLowerCase();

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs rounded ${colors[key] || "bg-gray-100 text-gray-700"}`}>
        {status || "unknown"}
      </span>
    );
  };

  const statusOptions = useMemo(() => {
    const values = Array.from(new Set(nfts.map((item) => item.status).filter(Boolean)));
    values.sort((a, b) => String(a).localeCompare(String(b), "tr"));

    return [
      { value: "all", label: "Tümü" },
      ...values.map((value) => ({ value: String(value), label: String(value) })),
    ];
  }, [nfts]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const filteredRows = useMemo(() => {
    return nfts.filter((row) => {
      if (filters.status !== "all" && String(row.status) !== filters.status) return false;
      const dateValue = row.created_at_formatted || row.created_at || row.updated_at;
      if (!withinDateRange(dateValue, filters.dateFrom, filters.dateTo)) return false;
      return true;
    });
  }, [filters.dateFrom, filters.dateTo, filters.status, nfts]);

  const columns = [
    {
      key: "id",
      header: "NFT ID",
      render: (_row, _rowIndex, serial) => <span className="text-xs text-slate-500">{serial}</span>,
    },
    {
      key: "status",
      header: "Mint Durumu",
      render: (row) => statusBadge(row.status),
    },
    {
      key: "token_id",
      header: "Token",
      render: (row) => <span className="text-xs font-medium">{row.token_id ?? "-"}</span>,
    },
    {
      key: "tx_hash",
      header: "Tx Hash",
      sortable: false,
      render: (row) =>
        row.tx_hash ? (
          <div className="inline-flex items-center gap-1">
            <a
              href={`https://sepolia.etherscan.io/tx/${row.tx_hash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 p-1 text-blue-700 hover:bg-blue-100"
              title="Etherscan'de aç"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(String(row.tx_hash))}
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-1 text-slate-600 hover:bg-slate-100"
              title="Tx hash kopyala"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
    {
      key: "ipfs_cid",
      header: "IPFS",
      sortable: false,
      render: (row) =>
        row.ipfs_cid ? (
          <div className="inline-flex items-center gap-1">
            <a
              href={`https://ipfs.io/ipfs/${row.ipfs_cid}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 p-1 text-emerald-700 hover:bg-emerald-100"
              title="IPFS dosyasını aç"
            >
              <Link2 className="h-3.5 w-3.5" />
            </a>
            <span className="text-[11px] text-slate-500">{String(row.ipfs_cid).slice(0, 8)}...</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
    {
      key: "created_at",
      header: "Tarih",
      render: (row) => <span className="text-xs text-slate-600">{formatDateTimeDDMMYYYY(row.created_at_formatted || row.created_at)}</span>,
    },
  ];

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen flex ta-shell">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="ta-page space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <button
                type="button"
                onClick={() => router.push(`/companies/${companyId}/employees/${employeeId}`)}
                className="text-xs text-slate-500 hover:text-slate-800 mb-1"
              >
                ← Çalışan detaya dön
              </button>
              <h1 className="text-xl font-semibold">Çalışan NFT&apos;leri</h1>
              <p className="text-xs text-slate-500">Firma #{companyId} / Çalışan #{employeeId}</p>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/companies/${companyId}/employees/${employeeId}/payrolls`)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <WalletCards className="h-4 w-4" />
              Bordrolar
            </button>
          </div>

          <section className="ta-card p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Mint Durumu</label>
                <Select2
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  options={statusOptions}
                  isSearchable
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Başlangıç Tarihi</label>
                <DatePicker
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                  placeholder="Başlangıç"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Bitiş Tarihi</label>
                <DatePicker
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                  placeholder="Bitiş"
                />
              </div>
            </div>
          </section>

          {error ? <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded">{error}</div> : null}

          {loading ? (
            <div className="ta-card p-6 text-sm text-slate-500">Yükleniyor...</div>
          ) : (
            <DataTable
              columns={columns}
              rows={filteredRows}
              rowKey="id"
              emptyText="Bu çalışana ait NFT bulunamadı."
              defaultPageSize={10}
              enableSearch
              searchPlaceholder="ID, token, durum, tx, ipfs ara..."
              searchableKeys={["id", "status", "token_id", "tx_hash", "ipfs_cid"]}
            />
          )}
        </main>
      </div>
    </div>
  );
}
