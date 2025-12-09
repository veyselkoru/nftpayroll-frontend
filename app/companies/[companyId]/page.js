"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import {
    fetchCompanyDetail,
    fetchCompanyNfts,
    fetchCompanies,
} from "@/lib/companies";
import { fetchEmployees } from "@/lib/employees";

export default function CompanyDetailPage() {
    const ready = useAuthGuard();
    const router = useRouter();
    const { companyId } = useParams();

    const [company, setCompany] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [nfts, setNfts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!ready || !companyId) return;

        const load = async () => {
            setLoading(true);
            setError("");

            try {
                // 1) Şirket detayı
                const c = await fetchCompanyDetail(companyId);
                setCompany(c);

                // 2) Çalışanlar
                try {
                    const empRes = await fetchEmployees(companyId);
                    const list = Array.isArray(empRes)
                        ? empRes
                        : empRes.data || [];
                    setEmployees(list);
                } catch {
                    // çalışan yoksa sessiz geç
                }

                // 3) NFT'ler
                try {
                    const nftsRes = await fetchCompanyNfts(companyId);
                    const list = nftsRes.nfts || nftsRes.data || [];
                    setNfts(list);
                } catch {
                    // nft yoksa sessiz geç
                }
            } catch (err) {
                setError(err.message || "Şirket detayı alınamadı");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [ready, companyId]);

    const goBack = () => {
        router.push("/companies");
    };

    const statusBadge = (status) => {
        const map = {
            pending: "bg-yellow-100 text-yellow-700",
            sending: "bg-blue-100 text-blue-700",
            sent: "bg-green-100 text-green-700",
            failed: "bg-red-100 text-red-700",
        };

        return (
            <span
                className={`inline-flex items-center px-2 py-1 text-[11px] rounded ${map[status] || "bg-gray-100 text-gray-700"
                    }`}
            >
                {status || "unknown"}
            </span>
        );
    };

    return (
        <div className="min-h-screen flex bg-slate-100">
            <Sidebar />

            <div className="flex flex-col flex-1 min-w-0">
                <Navbar />

                <main className="flex-1 px-6 py-6 max-w-6xl w-full mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <button
                                onClick={goBack}
                                className="text-xs text-slate-500 hover:text-slate-800 mb-1"
                            >
                                ← Şirket listesine dön
                            </button>
                            <h1 className="text-2xl font-bold">
                                {company?.name || `Şirket #${companyId}`}
                            </h1>
                            <p className="text-xs text-slate-500">
                                ID: {companyId}
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-sm text-slate-500">
                            Yükleniyor...
                        </div>
                    ) : !company ? (
                        <div className="text-sm text-slate-500">
                            Şirket bulunamadı.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* SOL: Şirket bilgileri */}
                            <div className="bg-white rounded-xl border p-4 space-y-3">
                                <div>
                                    <div className="text-xs text-slate-500">
                                        Şirket
                                    </div>
                                    <div className="text-lg font-semibold">
                                        {company.name}
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    {company.tax_number && (
                                        <div>
                                            <div className="text-xs text-slate-500">
                                                Vergi No
                                            </div>
                                            <div>{company.tax_number}</div>
                                        </div>
                                    )}

                                    {(company.country || company.city) && (
                                        <div>
                                            <div className="text-xs text-slate-500">
                                                Lokasyon
                                            </div>
                                            <div>
                                                {company.city && `${company.city}, `}
                                                {company.country}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <div className="text-xs text-slate-500">
                                            Çalışan sayısı
                                        </div>
                                        <div>{employees.length}</div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-slate-500">
                                            Toplam NFT
                                        </div>
                                        <div>{nfts.length}</div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                                    <button
                                        onClick={() =>
                                            router.push(
                                                `/companies/${companyId}/employees`
                                            )
                                        }
                                        className="px-3 py-1 rounded bg-slate-900 text-white hover:bg-slate-800 w-full text-center"
                                    >
                                        Çalışan listesi →
                                    </button>

                                    <button
                                        onClick={() =>
                                            router.push(
                                                `/companies/${companyId}/nfts`
                                            )
                                        }
                                        className="px-3 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 w-full text-center"
                                    >
                                        NFT&apos;leri görüntüle →
                                    </button>
                                </div>
                            </div>

                            {/* ORTA: Çalışanlar (son 5) */}
                            <div className="bg-white rounded-xl border p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs text-slate-500">
                                            Çalışanlar
                                        </div>
                                        <div className="text-sm font-semibold">
                                            Son eklenen çalışanlar
                                        </div>
                                    </div>
                                </div>

                                {employees.length === 0 ? (
                                    <div className="text-xs text-slate-500">
                                        Bu şirkete kayıtlı çalışan yok.
                                    </div>
                                ) : (
                                    <div className="space-y-2 text-xs max-h-[260px] overflow-auto">
                                        {employees
                                            .slice()
                                            .sort((a, b) => b.id - a.id)
                                            .slice(0, 5)
                                            .map((e) => (
                                                <button
                                                    key={e.id}
                                                    type="button"
                                                    onClick={() =>
                                                        router.push(
                                                            `/companies/${companyId}/employees/${e.id}/payrolls`
                                                        )
                                                    }
                                                    className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                                                >
                                                    <div className="font-medium">
                                                        {e.name ||
                                                            `Employee #${e.id}`}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">
                                                        ID: {e.id}
                                                    </div>
                                                </button>
                                            ))}
                                    </div>
                                )}
                            </div>

                            {/* SAĞ: Son NFT'ler (son 5) */}
                            <div className="bg-white rounded-xl border p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs text-slate-500">
                                            NFT&apos;ler
                                        </div>
                                        <div className="text-sm font-semibold">
                                            Son mint edilenler
                                        </div>
                                    </div>
                                </div>

                                {nfts.length === 0 ? (
                                    <div className="text-xs text-slate-500">
                                        Bu şirket için henüz mint edilmiş NFT
                                        yok.
                                    </div>
                                ) : (
                                    <div className="space-y-2 text-xs max-h-[260px] overflow-auto">
                                        {nfts.slice(0, 5).map((n) => (
                                            <div
                                                key={n.id}
                                                className="px-3 py-2 rounded-lg border border-slate-200"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="font-medium">
                                                        #{n.id}
                                                        {n.token_id && (
                                                            <span className="text-slate-400">
                                                                {" "}
                                                                (Token{" "}
                                                                {n.token_id})
                                                            </span>
                                                        )}
                                                    </div>
                                                    {statusBadge(n.status)}
                                                </div>
                                                <div className="text-[11px] text-slate-500 mt-1">
                                                    {n.employee || "Çalışan yok"}
                                                </div>
                                                {n.tx_hash && (
                                                    <div className="text-[11px] text-slate-500 mt-1 truncate">
                                                        Tx: {n.tx_hash}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
