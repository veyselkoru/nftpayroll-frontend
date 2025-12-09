"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";

import { fetchEmployees, fetchEmployeeNfts } from "@/lib/employees";
import { fetchPayrolls } from "@/lib/payrolls";

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
                // 1) Çalışan bilgisi (liste içinden bul)
                const employeesRes = await fetchEmployees(companyId);
                const employeesArr = Array.isArray(employeesRes)
                    ? employeesRes
                    : employeesRes.data || [];
                const emp = employeesArr.find(
                    (e) => String(e.id) === String(employeeId)
                );
                setEmployee(emp || null);

                // 2) Çalışanın payroll'ları
                try {
                    const payrollRes = await fetchPayrolls(
                        companyId,
                        employeeId
                    );
                    const payrollArr = Array.isArray(payrollRes)
                        ? payrollRes
                        : payrollRes.data || payrollRes.payrolls || [];
                    setPayrolls(payrollArr);
                } catch {
                    // payroll yoksa sessiz geç
                }

                // 3) Çalışanın NFT'leri
                try {
                    const nftsRes = await fetchEmployeeNfts(
                        companyId,
                        employeeId
                    );
                    const nftsArr = nftsRes.nfts || nftsRes.data || [];
                    setNfts(nftsArr);
                } catch {
                    // nft yoksa sessiz geç
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
                                ← Çalışan listesine dön
                            </button>
                            <h1 className="text-2xl font-bold">
                                {employee?.name ||
                                    `Çalışan #${employeeId}`}
                            </h1>
                            <p className="text-xs text-slate-500">
                                Company: {companyId} • Employee ID:{" "}
                                {employeeId}
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
                    ) : !employee ? (
                        <div className="text-sm text-slate-500">
                            Çalışan bulunamadı.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* SOL: Çalışan bilgisi */}
                            <div className="bg-white rounded-xl border p-4 space-y-3">
                                <div>
                                    <div className="text-xs text-slate-500">
                                        Çalışan
                                    </div>
                                    <div className="text-lg font-semibold">
                                        {employee.name ||
                                            `Employee #${employee.id}`}
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    {employee.position && (
                                        <div>
                                            <div className="text-xs text-slate-500">
                                                Pozisyon
                                            </div>
                                            <div>{employee.position}</div>
                                        </div>
                                    )}

                                    {employee.wallet_address && (
                                        <div>
                                            <div className="text-xs text-slate-500">
                                                Cüzdan Adresi
                                            </div>
                                            <div className="text-xs break-all">
                                                {employee.wallet_address}
                                            </div>
                                        </div>
                                    )}

                                    {employee.email && (
                                        <div>
                                            <div className="text-xs text-slate-500">
                                                E-posta
                                            </div>
                                            <div>{employee.email}</div>
                                        </div>
                                    )}

                                    <div>
                                        <div className="text-xs text-slate-500">
                                            Toplam Payroll
                                        </div>
                                        <div>{payrolls.length}</div>
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
                                                `/companies/${companyId}/employees/${employeeId}/payrolls`
                                            )
                                        }
                                        className="px-3 py-1 rounded bg-slate-900 text-white hover:bg-slate-800 w-full text-center"
                                    >
                                        Tüm payroll&apos;ları gör →
                                    </button>
                                </div>
                            </div>

                            {/* ORTA: Son payroll'lar */}
                            <div className="bg-white rounded-xl border p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs text-slate-500">
                                            Payroll&apos;lar
                                        </div>
                                        <div className="text-sm font-semibold">
                                            Son bordrolar
                                        </div>
                                    </div>
                                </div>

                                {payrolls.length === 0 ? (
                                    <div className="text-xs text-slate-500">
                                        Bu çalışanın henüz payroll kaydı
                                        yok.
                                    </div>
                                ) : (
                                    <div className="space-y-2 text-xs max-h-[260px] overflow-auto">
                                        {payrolls
                                            .slice()
                                            .sort((a, b) => b.id - a.id)
                                            .slice(0, 5)
                                            .map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() =>
                                                        router.push(
                                                            `/companies/${companyId}/employees/${employeeId}/payrolls/${p.id}`
                                                        )
                                                    }
                                                    className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="font-medium">
                                                            #{p.id} •{" "}
                                                            {
                                                                p.period_start
                                                            }{" "}
                                                            →{" "}
                                                            {p.period_end}
                                                        </div>
                                                        {statusBadge(
                                                            p.status
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">
                                                        Net / Brüt:{" "}
                                                        {
                                                            p.net_salary
                                                        }{" "}
                                                        /{" "}
                                                        {
                                                            p.gross_salary
                                                        }
                                                    </div>
                                                </button>
                                            ))}
                                    </div>
                                )}
                            </div>

                            {/* SAĞ: Son NFT'ler */}
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
                                        Bu çalışan için henüz mint edilmiş
                                        NFT yok.
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
