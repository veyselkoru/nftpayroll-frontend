"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import { fetchCompanies } from "@/lib/companies";
import { fetchEmployees } from "@/lib/employees";
import { fetchDashboardSummary, fetchDashboardRecentMints, } from "@/lib/dashboard";



export default function DashboardPage() {
    const ready = useAuthGuard(); // 1. hook
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

                // 1) Şirketleri çek
                const companiesResp = await fetchCompanies();
                const companies = Array.isArray(companiesResp)
                    ? companiesResp
                    : companiesResp.data || [];

                const totalCompanies = companies.length;

                // 2) Tüm şirketler için çalışan sayısı
                let totalEmployees = 0;

                for (const c of companies) {
                    try {
                        const employeesResp = await fetchEmployees(c.id);
                        const employeesArr = Array.isArray(employeesResp)
                            ? employeesResp
                            : employeesResp.data || [];
                        totalEmployees += employeesArr.length;
                    } catch {
                        // bir şirkette hata olsa bile diğerlerine devam
                    }
                }

                // 3) Dashboard summary (payroll + NFT istatistikleri)
                let summary = null;
                try {
                    summary = await fetchDashboardSummary();
                } catch {
                    // summary patlarsa bile companies/employees gösterilsin
                }

                // 4) Son mint edilenler
                let recent = [];
                try {
                    const resRecent = await fetchDashboardRecentMints();
                    recent = resRecent.items || resRecent.data || [];
                } catch {
                    // sessiz geç
                }

                setStats((prev) => ({
                    ...prev,
                    companies: totalCompanies,
                    employees: totalEmployees,
                    payrolls: summary?.payrolls ?? prev.payrolls,
                    nftsTotal: summary?.nfts?.total ?? prev.nftsTotal,
                    nftsPending: summary?.nfts?.by_status?.pending ?? prev.nftsPending,
                    nftsSending: summary?.nfts?.by_status?.sending ?? prev.nftsSending,
                    nftsSent: summary?.nfts?.by_status?.sent ?? prev.nftsSent,
                    nftsFailed: summary?.nfts?.by_status?.failed ?? prev.nftsFailed,
                }));

                // Son şirketler
                const sorted = [...companies].sort((a, b) => b.id - a.id);
                setRecentCompanies(sorted.slice(0, 5));
                setRecentMints(recent);
            } catch (err) {
                setError(err.message || "Dashboard verileri alınamadı");
            } finally {
                setLoading(false);
            }
        };


        load();
    }, [ready]);

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
                Yükleniyor...
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-slate-100">
            {/* SOL MENÜ */}
            <Sidebar />

            {/* SAĞ TARAF */}
            <div className="flex flex-col flex-1 min-w-0">
                <Navbar />

                <main className="flex-1 px-6 py-6 max-w-6xl w-full mx-auto space-y-6">
                    <h1 className="text-2xl font-bold">Hoş geldin 👋</h1>

                    {error && (
                        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Toplam şirket kartı → /companies */}
                        <button
                            type="button"
                            onClick={() => router.push("/companies")}
                            className="text-left bg-white rounded-xl border p-4 hover:shadow-sm transition cursor-pointer"
                        >
                            <div className="text-sm text-slate-500">Toplam Şirket</div>
                            <div className="mt-2 text-3xl font-bold">
                                {loading ? "…" : stats.companies}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-400">
                                Tüm şirketleri gör →
                            </div>
                        </button>

                        {/* Toplam çalışan kartı → şimdilik /companies (çalışanlar şirket altında) */}
                        <button
                            type="button"
                            onClick={() => router.push("/companies")}
                            className="text-left bg-white rounded-xl border p-4 hover:shadow-sm transition cursor-pointer"
                        >
                            <div className="text-sm text-slate-500">Toplam Çalışan</div>
                            <div className="mt-2 text-3xl font-bold">
                                {loading ? "…" : stats.employees}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-400">
                                Çalışan listelerine git →
                            </div>
                        </button>

                        {/* Mint istatistikleri kartı (şimdilik statik, istersen buraya da link koyarız) */}
                        <div className="bg-white rounded-xl border p-4">
                            <div className="text-sm text-slate-500">Mint İstatistikleri</div>

                            {loading ? (
                                <div className="mt-2 text-sm text-slate-500">Yükleniyor…</div>
                            ) : (
                                <div className="mt-2 space-y-1 text-sm">
                                    <div>
                                        <span className="font-semibold">Toplam NFT:</span>{" "}
                                        {stats.nftsTotal}
                                    </div>
                                    <div className="text-xs text-slate-600">
                                        Pending: {stats.nftsPending} • Sending: {stats.nftsSending} • Sent:{" "}
                                        {stats.nftsSent} • Failed: {stats.nftsFailed}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Toplam payroll: {stats.payrolls}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>



                    {/* Son mint edilen bordrolar */}
                    <div className="mt-6 bg-white rounded-xl border p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="text-xs text-slate-500">
                                    Son mint edilen bordrolar
                                </div>
                                <div className="text-sm font-semibold">
                                    Mint aktivite özeti
                                </div>
                            </div>
                            {/* İstersen buraya "Tüm NFT'ler" linki koyabiliriz */}
                            {/* <button
            onClick={() => router.push("/companies/1/nfts")}
            className="text-xs text-slate-500 hover:text-slate-800"
        >
            Tümünü gör →
        </button> */}
                        </div>

                        {loading ? (
                            <div className="text-xs text-slate-500">Yükleniyor...</div>
                        ) : recentMints.length === 0 ? (
                            <div className="text-xs text-slate-500">
                                Henüz mint edilmiş NFT bordrosu bulunmuyor.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                    <thead>
                                        <tr className="text-left text-slate-500 border-b">
                                            <th className="py-2 pr-4">ID</th>
                                            <th className="py-2 pr-4">Employee</th>
                                            <th className="py-2 pr-4">Status</th>
                                            <th className="py-2 pr-4">Tx</th>
                                            <th className="py-2 pr-4">Tarih</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentMints.map((m) => (
                                            <tr key={m.id} className="border-b last:border-b-0">
                                                {/* ID → Payroll Detay linki */}
                                                <td className="py-2 pr-4">
                                                    {m.company_id && m.employee_id && m.payroll_id ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                router.push(
                                                                    `/companies/${m.company_id}/employees/${m.employee_id}/payrolls/${m.payroll_id}`
                                                                )
                                                            }
                                                            className="text-xs text-slate-900 hover:underline"
                                                        >
                                                            #{m.id}
                                                            {m.payroll_id && (
                                                                <span className="text-slate-400">
                                                                    {" "}
                                                                    (P{m.payroll_id})
                                                                </span>
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <>
                                                            #{m.id}
                                                            {m.payroll_id && (
                                                                <span className="text-slate-400">
                                                                    {" "}
                                                                    (P{m.payroll_id})
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </td>

                                                {/* Employee → o çalışanın payroll listesine link */}
                                                <td className="py-2 pr-4">
                                                    {m.company_id && m.employee_id ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                router.push(
                                                                    `/companies/${m.company_id}/employees/${m.employee_id}/payrolls`
                                                                )
                                                            }
                                                            className="text-xs text-slate-700 hover:underline"
                                                        >
                                                            {m.employee || `Employee #${m.employee_id}`}
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-slate-500">
                                                            {m.employee || "-"}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="py-2 pr-4">
                                                    <span
                                                        className={[
                                                            "inline-flex px-2 py-1 rounded-full capitalize",
                                                            m.status === "sent"
                                                                ? "bg-green-100 text-green-700"
                                                                : m.status === "failed"
                                                                    ? "bg-red-100 text-red-700"
                                                                    : "bg-slate-100 text-slate-700",
                                                        ].join(" ")}
                                                    >
                                                        {m.status || "unknown"}
                                                    </span>
                                                </td>

                                                {/* Tx (sadece kısaltma, detay payroll sayfasında) */}
                                                <td className="py-2 pr-4 max-w-[180px]">
                                                    {m.tx_hash ? (
                                                        <span className="block truncate text-xs text-slate-700">
                                                            {m.tx_hash}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">-</span>
                                                    )}
                                                </td>

                                                {/* Tarih */}
                                                <td className="py-2 pr-4 text-xs text-slate-500">
                                                    {m.created_at
                                                        ? new Date(m.created_at).toLocaleString()
                                                        : "-"}
                                                </td>

                                                {/* ➕ Şirket detaya link */}
                                                <td className="py-2 pr-4 text-right">
                                                    {m.company_id && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                router.push(
                                                                    `/companies/${m.company_id}`
                                                                )
                                                            }
                                                            className="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                        >
                                                            Şirket detaya →
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>



                    <div className="bg-white rounded-xl border p-4">
                        <div className="font-semibold mb-2">Son Şirketler</div>

                        {loading ? (
                            <div className="text-sm text-slate-500">Yükleniyor…</div>
                        ) : recentCompanies.length === 0 ? (
                            <div className="text-sm text-slate-500">
                                Henüz kayıtlı şirket yok.
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2">ID</th>
                                        <th className="text-left p-2">Ad</th>
                                        <th className="text-left p-2">Vergi No</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentCompanies.map((c) => (
                                        <tr key={c.id} className="border-b">
                                            <td className="p-2">{c.id}</td>
                                            <td className="p-2">{c.name}</td>
                                            <td className="p-2">{c.tax_no}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border p-4">
                        <div className="font-semibold mb-2">Son İşlemler</div>
                        <p className="text-sm text-slate-500">
                            Şu an için temel özet gösteriliyor. Laravel tarafına özel bir
                            dashboard endpoint’i eklediğimizde burayı gerçek mint / payroll
                            akışıyla doldurabiliriz.
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
