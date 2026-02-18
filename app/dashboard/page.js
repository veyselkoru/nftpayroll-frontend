"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Building2,
  Clock3,
  FileText,
  Users,
} from "lucide-react";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import { fetchCompanies } from "@/lib/companies";
import { fetchEmployees } from "@/lib/employees";
import { fetchDashboardSummary, fetchDashboardRecentMints } from "@/lib/dashboard";
import { formatDateTimeDDMMYYYY } from "@/lib/date";

const statusColorMap = {
  pending: "bg-amber-500",
  sending: "bg-blue-500",
  sent: "bg-emerald-500",
  failed: "bg-rose-500",
};

export default function DashboardPage() {
  const ready = useAuthGuard();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    companies: 0,
    employees: 0,
    payrolls: 0,
    nftsTotal: 0,
    nftsPending: 0,
    nftsSending: 0,
    nftsSent: 0,
    nftsFailed: 0,
  });

  const [recentCompanies, setRecentCompanies] = useState([]);
  const [recentMints, setRecentMints] = useState([]);

  useEffect(() => {
    if (!ready) return;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const companiesResp = await fetchCompanies();
        const companies = Array.isArray(companiesResp) ? companiesResp : companiesResp.data || [];

        let totalEmployees = 0;
        await Promise.all(
          companies.map(async (company) => {
            try {
              const employeesResp = await fetchEmployees(company.id);
              const employees = Array.isArray(employeesResp) ? employeesResp : employeesResp.data || [];
              totalEmployees += employees.length;
            } catch {
              // ignore per-company employee fetch errors
            }
          })
        );

        let summary = null;
        try {
          summary = await fetchDashboardSummary();
        } catch {
          // ignore summary errors and keep existing defaults
        }

        let recent = [];
        try {
          const recentResp = await fetchDashboardRecentMints();
          recent = recentResp.items || recentResp.data || [];
        } catch {
          // ignore recent activity errors
        }

        setStats((prev) => ({
          ...prev,
          companies: companies.length,
          employees: totalEmployees,
          payrolls: summary?.payrolls ?? prev.payrolls,
          nftsTotal: summary?.nfts?.total ?? prev.nftsTotal,
          nftsPending: summary?.nfts?.by_status?.pending ?? prev.nftsPending,
          nftsSending: summary?.nfts?.by_status?.sending ?? prev.nftsSending,
          nftsSent: summary?.nfts?.by_status?.sent ?? prev.nftsSent,
          nftsFailed: summary?.nfts?.by_status?.failed ?? prev.nftsFailed,
        }));

        setRecentCompanies([...companies].sort((a, b) => b.id - a.id).slice(0, 6));
        setRecentMints(recent);
      } catch (err) {
        setError(err.message || "Dashboard verileri alınamadı");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [ready]);

  const mintStatusItems = useMemo(() => {
    const total = stats.nftsTotal || 0;
    const rows = [
      { key: "pending", label: "Pending", value: stats.nftsPending },
      { key: "sending", label: "Sending", value: stats.nftsSending },
      { key: "sent", label: "Sent", value: stats.nftsSent },
      { key: "failed", label: "Failed", value: stats.nftsFailed },
    ];

    return rows.map((row) => ({
      ...row,
      percentage: total > 0 ? Math.round((row.value / total) * 100) : 0,
    }));
  }, [stats]);

  const successRate = useMemo(() => {
    if (!stats.nftsTotal) return 0;
    return Math.round((stats.nftsSent / stats.nftsTotal) * 100);
  }, [stats]);

  const kpiCards = [
    {
      title: "Toplam Firma",
      value: stats.companies,
      icon: Building2,
      helper: "Kayıtlı firma adedi",
      onClick: () => router.push("/companies"),
    },
    {
      title: "Toplam Çalışan",
      value: stats.employees,
      icon: Users,
      helper: "Aktif çalışan havuzu",
      onClick: () => router.push("/companies"),
    },
    {
      title: "Toplam Payroll",
      value: stats.payrolls,
      icon: FileText,
      helper: "Üretilen bordro adedi",
      onClick: () => router.push("/reports"),
    },
    {
      title: "Mint Başarı",
      value: `${successRate}%`,
      icon: BadgeCheck,
      helper: `${stats.nftsSent}/${stats.nftsTotal || 0} başarılı`,
      onClick: () => router.push("/reports"),
    },
  ];

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex ta-shell">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Navbar />

        <main className="ta-page space-y-6">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.title}
                  type="button"
                  onClick={card.onClick}
                  className="ta-card p-4 text-left transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">{card.title}</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">{loading ? "…" : card.value}</p>
                      <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#e9edf7] text-[#111b3a]">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="ta-card p-5 xl:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Mint Pipeline</p>
                  <h2 className="text-lg font-semibold text-slate-900">NFT Durum Dağılımı</h2>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                  <Activity className="w-3.5 h-3.5" />
                  Toplam {stats.nftsTotal} NFT
                </span>
              </div>

              <div className="space-y-3">
                {mintStatusItems.map((item) => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <span className="text-slate-500">
                        {item.value} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full ${statusColorMap[item.key] || "bg-slate-400"}`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Pending</p>
                  <p className="text-lg font-semibold text-slate-900">{stats.nftsPending}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Sending</p>
                  <p className="text-lg font-semibold text-slate-900">{stats.nftsSending}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Sent</p>
                  <p className="text-lg font-semibold text-slate-900">{stats.nftsSent}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Failed</p>
                  <p className="text-lg font-semibold text-slate-900">{stats.nftsFailed}</p>
                </div>
              </div>
            </div>

            <div className="ta-card p-5 xl:col-span-4 space-y-4">
              <div>
                <p className="text-xs text-slate-500">System Health</p>
                <h2 className="text-lg font-semibold text-slate-900">Operasyon Özeti</h2>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" />
                    Başarılı Mint
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{stats.nftsSent}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Clock3 className="h-4 w-4 text-amber-600" />
                    Kuyruktaki İşlem
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{stats.nftsPending + stats.nftsSending}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    Hatalı İşlem
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{stats.nftsFailed}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push("/requests")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                İşlem Taleplerini Gör
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="ta-card p-5 xl:col-span-8">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Recent Mints</p>
                  <h2 className="text-lg font-semibold text-slate-900">Son Mint Aktiviteleri</h2>
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500">Yükleniyor...</p>
              ) : recentMints.length === 0 ? (
                <p className="text-sm text-slate-500">Henüz mint aktivitesi bulunmuyor.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="py-2 pr-4">Payroll</th>
                        <th className="py-2 pr-4">Çalışan</th>
                        <th className="py-2 pr-4">Durum</th>
                        <th className="py-2 pr-4">Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentMints.slice(0, 10).map((mint) => (
                        <tr key={mint.id} className="border-b last:border-b-0">
                          <td className="py-2 pr-4">
                            {mint.company_id && mint.employee_id && mint.payroll_id ? (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/companies/${mint.company_id}/employees/${mint.employee_id}/payrolls/${mint.payroll_id}`
                                  )
                                }
                                className="text-slate-900 hover:underline"
                              >
                                #{mint.id}
                              </button>
                            ) : (
                              `#${mint.id}`
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            {mint.employee || (mint.employee_id ? `Employee #${mint.employee_id}` : "-")}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className={[
                                "inline-flex rounded-full px-2 py-1 capitalize",
                                mint.status === "sent"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : mint.status === "failed"
                                    ? "bg-rose-100 text-rose-700"
                                    : mint.status === "sending"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-amber-100 text-amber-700",
                              ].join(" ")}
                            >
                              {mint.status || "unknown"}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-slate-500">
                            {mint.created_at ? formatDateTimeDDMMYYYY(mint.created_at) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="ta-card p-5 xl:col-span-4">
              <div className="mb-3">
                <p className="text-xs text-slate-500">Recent Companies</p>
                <h2 className="text-lg font-semibold text-slate-900">Son Firmalar</h2>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500">Yükleniyor...</p>
              ) : recentCompanies.length === 0 ? (
                <p className="text-sm text-slate-500">Henüz firma bulunmuyor.</p>
              ) : (
                <div className="space-y-2">
                  {recentCompanies.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => router.push(`/companies/${company.id}`)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <p className="text-sm font-medium text-slate-800 truncate">{company.name || `Firma #${company.id}`}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">ID: {company.id}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
