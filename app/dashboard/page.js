"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import { fetchCompanies } from "@/lib/companies";
import { fetchEmployees } from "@/lib/employees";

export default function DashboardPage() {
    const ready = useAuthGuard(); // 1. hook
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [stats, setStats] = useState({
        companies: 0,
        employees: 0,
    });
    const [recentCompanies, setRecentCompanies] = useState([]);

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

                // 2) Tüm şirketler için çalışanları çek (basit ama küçük projede yeterli)
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

                setStats({
                    companies: totalCompanies,
                    employees: totalEmployees,
                });

                // Son şirketleri (id'e göre) sırala
                const sorted = [...companies].sort((a, b) => b.id - a.id);
                setRecentCompanies(sorted.slice(0, 5));
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
                        <div className="bg-white rounded-xl border p-4">
                            <div className="text-sm text-slate-500">Toplam Şirket</div>
                            <div className="mt-2 text-3xl font-bold">
                                {loading ? "…" : stats.companies}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border p-4">
                            <div className="text-sm text-slate-500">Toplam Çalışan</div>
                            <div className="mt-2 text-3xl font-bold">
                                {loading ? "…" : stats.employees}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border p-4">
                            <div className="text-sm text-slate-500">Mint Durumu</div>
                            <div className="mt-2 text-sm text-slate-600">
                                Mint akışını Payroll & NFT sayfalarından takip edebilirsin.
                            </div>
                        </div>
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
