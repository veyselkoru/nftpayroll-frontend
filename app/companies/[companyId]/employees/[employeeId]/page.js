"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  User,
  FileText,
  AlertCircle,
  IdCard,
  Briefcase,
  Building2,
  Calendar,
  Wallet,
  Mail,
} from "lucide-react";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import { fetchEmployees, fetchEmployeeNfts } from "@/lib/employees";
import { fetchPayrolls } from "@/lib/payrolls";
import { formatDateDDMMYYYY } from "@/lib/date";

function maskTc(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "-";
  if (digits.length <= 5) return `${digits.slice(0, 1)}***${digits.slice(-1)}`;
  return `${digits.slice(0, 3)}*****${digits.slice(-2)}`;
}

function normalizeStatus(value) {
  return String(value || "").toLowerCase();
}

function hasObjection(source) {
  const candidates = [
    source?.objection_status,
    source?.appeal_status,
    source?.dispute_status,
    source?.objection?.status,
    source?.appeal?.status,
  ];

  if (source?.has_objection === true || source?.objection === true) return true;

  return candidates.some((value) => {
    const v = normalizeStatus(value);
    return ["open", "pending", "in_review", "approved", "rejected", "resolved"].includes(v);
  });
}

export default function EmployeeDetailPage() {
  const ready = useAuthGuard();
  const router = useRouter();
  const { companyId, employeeId } = useParams();

  const [employee, setEmployee] = useState(null);
  const [payrolls, setPayrolls] = useState([]);
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !companyId || !employeeId) return;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const employeesRes = await fetchEmployees(companyId);
        const employeesArr = Array.isArray(employeesRes) ? employeesRes : employeesRes.data || [];
        const emp = employeesArr.find((e) => String(e.id) === String(employeeId));
        setEmployee(emp || null);

        try {
          const payrollRes = await fetchPayrolls(companyId, employeeId);
          const payrollArr = Array.isArray(payrollRes) ? payrollRes : payrollRes.data || payrollRes.payrolls || [];
          setPayrolls(payrollArr);
        } catch {
          setPayrolls([]);
        }

        try {
          const nftsRes = await fetchEmployeeNfts(companyId, employeeId);
          const nftsArr = nftsRes.nfts || nftsRes.data || [];
          setNfts(nftsArr);
        } catch {
          setNfts([]);
        }
      } catch (err) {
        setError(err.message || "Çalışan detayı alınamadı");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [ready, companyId, employeeId]);

  const goBack = () => {
    router.push(`/companies/${companyId}/employees`);
  };

  const statusBadge = (status) => {
    const s = normalizeStatus(status);
    const map = {
      pending: "bg-yellow-100 text-yellow-700",
      sending: "bg-blue-100 text-blue-700",
      queued: "bg-blue-100 text-blue-700",
      sent: "bg-green-100 text-green-700",
      minted: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      mint_failed: "bg-red-100 text-red-700",
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 text-[11px] rounded ${map[s] || "bg-gray-100 text-gray-700"}`}>
        {status || "unknown"}
      </span>
    );
  };

  const objectionCount = useMemo(() => {
    const payrollObjections = payrolls.filter((p) => hasObjection(p)).length;
    const nftObjections = nfts.filter((n) => hasObjection(n)).length;
    return Math.max(payrollObjections, nftObjections);
  }, [payrolls, nfts]);

  const yearlyNftSeries = useMemo(() => {
    const now = new Date();
    const years = [];
    for (let i = 5; i >= 0; i -= 1) {
      const y = now.getFullYear() - i;
      years.push({ year: y, count: 0 });
    }

    const yearMap = new Map(years.map((item) => [item.year, item]));
    nfts.forEach((nft) => {
      const raw = nft.created_at_formatted || nft.created_at;
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      const item = yearMap.get(d.getFullYear());
      if (item) item.count += 1;
    });

    return years;
  }, [nfts]);

  const maxYearlyNft = useMemo(() => Math.max(1, ...yearlyNftSeries.map((x) => x.count)), [yearlyNftSeries]);

  const employeeProfile = [
    { label: "Ad Soyad", value: [employee?.name, employee?.surname].filter(Boolean).join(" ") || `Çalışan #${employeeId}`, icon: User },
    { label: "Çalışan Kodu", value: employee?.employee_code || "-", icon: IdCard },
    { label: "TC Kimlik", value: maskTc(employee?.tc_no || employee?.national_id), icon: IdCard },
    { label: "Pozisyon", value: employee?.position || "-", icon: Briefcase },
    { label: "Departman", value: employee?.department || "-", icon: Building2 },
    { label: "İşe Başlama", value: formatDateDDMMYYYY(employee?.start_date), icon: Calendar },
    { label: "Wallet", value: employee?.wallet_address || employee?.wallet || "-", icon: Wallet },
    { label: "E-posta", value: employee?.email || "-", icon: Mail },
  ];

  const recentPayrollNfts = useMemo(
    () =>
      [...payrolls]
        .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
        .slice(0, 10),
    [payrolls]
  );

  const objectionNfts = useMemo(() => {
    const fromPayrolls = payrolls
      .filter((p) => hasObjection(p) || hasObjection(p?.nft))
      .map((p) => ({
        key: `payroll-${p.id}`,
        payrollId: p.id,
        periodStart: p.period_start,
        periodEnd: p.period_end,
        nftStatus: p?.nft?.status || p?.status,
        objectionStatus: p?.objection_status || p?.nft?.objection_status || p?.appeal_status || p?.dispute_status || "pending",
      }));

    return fromPayrolls.slice(0, 10);
  }, [payrolls]);

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen flex ta-shell">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Navbar />

        <main className="ta-page space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <button onClick={goBack} className="text-xs text-slate-500 hover:text-slate-800 mb-1">
                ← Çalışan listesine dön
              </button>
              <h1 className="text-2xl font-bold">{[employee?.name, employee?.surname].filter(Boolean).join(" ") || `Çalışan #${employeeId}`}</h1>
              <p className="text-xs text-slate-500">Firma #{companyId} / Çalışan #{employeeId}</p>
            </div>
          </div>

          {error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">{error}</div>
          ) : null}

          {loading ? (
            <div className="text-sm text-slate-500">Yükleniyor...</div>
          ) : !employee ? (
            <div className="text-sm text-slate-500">Çalışan bulunamadı.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
                <section className="ta-card p-4 space-y-4 xl:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => router.push(`/companies/${companyId}/employees/${employeeId}/payrolls`)}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-100 transition min-h-[120px]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-slate-500">Bordro Sayısı</div>
                          <div className="mt-2 text-2xl font-bold text-slate-900">{payrolls.length}</div>
                          <div className="mt-1 text-[11px] text-slate-500">Çalışan bordro listesini aç →</div>
                        </div>
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white text-slate-700 border border-slate-200">
                          <FileText className="w-4 h-4" />
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-100 transition min-h-[120px]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-slate-500">İtiraz Sayısı</div>
                          <div className="mt-2 text-2xl font-bold text-slate-900">{objectionCount}</div>
                          <div className="mt-1 text-[11px] text-slate-500">İtiraz yönetimi hazırlık alanı</div>
                        </div>
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white text-slate-700 border border-slate-200">
                          <AlertCircle className="w-4 h-4" />
                        </span>
                      </div>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold">Yıllık NFT</h2>
                      <span className="text-[11px] text-slate-500">Son 6 yıl</span>
                    </div>
                    <div className="h-44 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="h-full flex items-end gap-2">
                        {yearlyNftSeries.map((item) => {
                          const h = Math.max(6, Math.round((item.count / maxYearlyNft) * 100));
                          return (
                            <div key={item.year} className="flex-1 flex flex-col items-center justify-end gap-1">
                              <div className="text-[10px] text-slate-500">{item.count}</div>
                              <div
                                className="w-full max-w-8 rounded-md bg-[#4f6df5] hover:bg-[#3f5ae0] transition-all"
                                style={{ height: `${h}%` }}
                                title={`${item.year}: ${item.count} NFT`}
                              />
                              <div className="text-[10px] text-slate-600">{item.year}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="ta-card p-4 space-y-3 xl:col-span-1 xl:min-h-[316px]">
                  <h2 className="text-lg font-semibold">Çalışan Künyesi</h2>
                  <p className="text-xs text-slate-500">Çalışana ait temel kayıt bilgileri</p>
                  <div className="space-y-1.5">
                    {employeeProfile.map((item) => (
                      <div key={item.label} className="flex items-start gap-2.5 py-2 border-b border-slate-100 last:border-b-0">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                          <item.icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-500">{item.label}</p>
                          <p className="text-sm text-slate-800 break-words">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <section className="ta-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Son 10 Bordro NFT</h2>
                    <button
                      type="button"
                      onClick={() => router.push(`/companies/${companyId}/employees/${employeeId}/payrolls`)}
                      className="text-xs text-[#111b3a] hover:underline"
                    >
                      Tümünü Gör
                    </button>
                  </div>

                  <div className="space-y-2">
                    {recentPayrollNfts.length === 0 ? (
                      <p className="text-xs text-slate-500">Bordro NFT kaydı yok.</p>
                    ) : (
                      recentPayrollNfts.map((payroll) => (
                        <button
                          key={payroll.id}
                          type="button"
                          onClick={() => router.push(`/companies/${companyId}/employees/${employeeId}/payrolls/${payroll.id}`)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                Bordro #{payroll.id} • {formatDateDDMMYYYY(payroll.period_start)} - {formatDateDDMMYYYY(payroll.period_end)}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Token: {payroll?.nft?.token_id ?? "-"} • Net: {payroll.net_salary ?? "-"}
                              </p>
                            </div>
                            {statusBadge(payroll?.nft?.status || payroll?.status)}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </section>

                <section className="ta-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Son 10 İtiraz NFT</h2>
                    <span className="text-xs text-slate-500">Hazırlık modülü</span>
                  </div>

                  <div className="space-y-2">
                    {objectionNfts.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Henüz itiraz kaydı yok. Çalışan itiraz akışı açıldığında bu listede durumlar görünecek.
                      </p>
                    ) : (
                      objectionNfts.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => router.push(`/companies/${companyId}/employees/${employeeId}/payrolls/${item.payrollId}`)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                Bordro #{item.payrollId} • {formatDateDDMMYYYY(item.periodStart)} - {formatDateDDMMYYYY(item.periodEnd)}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                İtiraz Durumu: {item.objectionStatus || "pending"}
                              </p>
                            </div>
                            {statusBadge(item.nftStatus)}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
