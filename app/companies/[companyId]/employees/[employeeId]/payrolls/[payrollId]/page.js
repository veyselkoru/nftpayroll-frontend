"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";

import {
    fetchPayrollDetail,
    queuePayrollApi,
    payrollStatusApi,
    retryMintApi,
    decryptPayrollApi,
} from "@/lib/payrolls";

export default function PayrollDetailPage() {
    const ready = useAuthGuard();
    const router = useRouter();
    const { companyId, employeeId, payrollId } = useParams();

    const [payroll, setPayroll] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [decryptState, setDecryptState] = useState({
        loading: false,
        error: "",
        payload: null,
    });

    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!ready || !companyId || !employeeId || !payrollId) return;

        const load = async () => {
            setLoading(true);
            setError("");

            try {
                const res = await fetchPayrollDetail(
                    companyId,
                    employeeId,
                    payrollId
                );
                setPayroll(res.payroll || res.data || res);
            } catch (err) {
                setError(err.message || "Payroll detay alınamadı");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [ready, companyId, employeeId, payrollId]);

    const badge = (status) => {
        const map = {
            pending: "bg-yellow-100 text-yellow-700",
            queued: "bg-blue-100 text-blue-700",
            processing: "bg-blue-100 text-blue-700",
            sent: "bg-green-100 text-green-700",
            failed: "bg-red-100 text-red-700",
        };

        return (
            <span
                className={`inline-flex items-center px-2 py-1 text-xs rounded ${map[status] || "bg-gray-100 text-gray-700"
                    }`}
            >
                {status || "unknown"}
            </span>
        );
    };

    // ---- Queue Mint ----
    const handleQueue = async () => {
        if (!payroll) return;
        try {
            setActionLoading(true);
            await queuePayrollApi(companyId, employeeId, payroll.id);
            // tekrar detay yükle
            const res = await fetchPayrollDetail(
                companyId,
                employeeId,
                payrollId
            );
            setPayroll(res.payroll || res.data || res);
        } catch (err) {
            alert(err.message || "Queue mint hata");
        } finally {
            setActionLoading(false);
        }
    };

    // ---- Status ----
    const handleStatus = async () => {
        if (!payroll) return;
        try {
            const res = await payrollStatusApi(
                companyId,
                employeeId,
                payroll.id
            );
            alert("Güncel durum: " + JSON.stringify(res, null, 2));
        } catch (err) {
            alert(err.message || "Durum alınamadı");
        }
    };

    // ---- Retry ----
    const handleRetry = async () => {
        if (!payroll) return;
        try {
            setActionLoading(true);
            await retryMintApi(companyId, employeeId, payroll.id);
            const res = await fetchPayrollDetail(
                companyId,
                employeeId,
                payrollId
            );
            setPayroll(res.payroll || res.data || res);
        } catch (err) {
            alert(err.message || "Retry mint hata");
        } finally {
            setActionLoading(false);
        }
    };

    // ---- Decrypt ----
    const handleDecrypt = async () => {
        if (!payroll) return;

        setDecryptState({
            loading: true,
            error: "",
            payload: null,
        });

        try {
            const res = await decryptPayrollApi(
                companyId,
                employeeId,
                payroll.id
            );

            setDecryptState({
                loading: false,
                error: "",
                payload:
                    res.decrypted_payload ||
                    res.payload ||
                    res.data?.decrypted_payload ||
                    null,
            });
        } catch (err) {
            setDecryptState({
                loading: false,
                error: err.message || "Decrypt failed",
                payload: null,
            });
        }
    };

    const goBack = () => {
        router.push(
            `/companies/${companyId}/employees/${employeeId}/payrolls`
        );
    };

    return (
        <div className="min-h-screen flex bg-slate-100">
            <Sidebar />

            <div className="flex flex-col flex-1 min-w-0">
                <Navbar />

                <main className="flex-1 p-4 md:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <button
                                onClick={goBack}
                                className="text-xs text-slate-500 hover:text-slate-800 mb-1"
                            >
                                ← Payroll listesine dön
                            </button>
                            <h1 className="text-xl font-semibold">
                                Payroll Detay #{payrollId}
                            </h1>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>Company: {companyId}</span>
                            <span>•</span>
                            <button
                                type="button"
                                onClick={() =>
                                    router.push(
                                        `/companies/${companyId}/employees/${employeeId}`
                                    )
                                }
                                className="underline hover:text-slate-800"
                            >
                                Employee: {employeeId}
                            </button>
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
                    ) : !payroll ? (
                        <div className="text-sm text-slate-500">
                            Payroll bulunamadı.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* SOL: Payroll info */}
                            <div className="bg-white rounded-xl border p-4 space-y-3 lg:col-span-1">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs text-slate-500">
                                            Çalışan
                                        </div>
                                        <div className="font-semibold">
                                            {payroll.employee?.name ||
                                                `Employee #${payroll.employee_id}`}
                                        </div>
                                    </div>
                                    <div>{badge(payroll.status)}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                                    <div>
                                        <div className="text-xs text-slate-500">
                                            Dönem
                                        </div>
                                        <div>
                                            {payroll.period_start} →{" "}
                                            {payroll.period_end}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500">
                                            Net / Brüt
                                        </div>
                                        <div>
                                            {payroll.net_salary} /{" "}
                                            {payroll.gross_salary}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500">
                                            ID
                                        </div>
                                        <div>{payroll.id}</div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-100 space-x-2 text-xs">
                                    <button
                                        onClick={handleQueue}
                                        disabled={actionLoading}
                                        className="px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-60"
                                    >
                                        Queue Mint
                                    </button>
                                    <button
                                        onClick={handleStatus}
                                        className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    >
                                        Status
                                    </button>
                                    <button
                                        onClick={handleRetry}
                                        disabled={actionLoading}
                                        className="px-3 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-60"
                                    >
                                        Retry Mint
                                    </button>
                                </div>
                            </div>

                            {/* ORTA: NFT info */}
                            <div className="bg-white rounded-xl border p-4 space-y-3 lg:col-span-1">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs text-slate-500">
                                            NFT
                                        </div>
                                        <div className="font-semibold">
                                            {payroll.nft_mint
                                                ? `Mint #${payroll.nft_mint.id}`
                                                : "Henüz mint yok"}
                                        </div>
                                    </div>
                                    {payroll.nft_mint &&
                                        badge(payroll.nft_mint.status)}
                                </div>

                                {payroll.nft_mint ? (
                                    <div className="space-y-2 text-sm mt-2">
                                        <div>
                                            <div className="text-xs text-slate-500">
                                                Token ID
                                            </div>
                                            <div>
                                                {payroll.nft_mint.token_id ??
                                                    "-"}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500">
                                                Tx Hash
                                            </div>
                                            {payroll.nft_mint.tx_hash ? (
                                                <a
                                                    href={`https://sepolia.etherscan.io/tx/${payroll.nft_mint.tx_hash}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs text-green-700 underline break-all"
                                                >
                                                    {payroll.nft_mint.tx_hash}
                                                </a>
                                            ) : (
                                                <div className="text-xs text-slate-400">
                                                    Henüz tx yok
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500">
                                                IPFS
                                            </div>
                                            {payroll.nft_mint.ipfs_cid ? (
                                                <a
                                                    href={`https://ipfs.io/ipfs/${payroll.nft_mint.ipfs_cid}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs text-blue-700 underline break-all"
                                                >
                                                    {`https://ipfs.io/ipfs/${payroll.nft_mint.ipfs_cid}`}
                                                </a>
                                            ) : (
                                                <div className="text-xs text-slate-400">
                                                    IPFS CID yok
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-3 text-xs text-slate-500">
                                        Bu payroll için henüz NFT mint
                                        edilmemiş.
                                    </div>
                                )}
                            </div>

                            {/* SAĞ: Decrypted payload */}
                            <div className="bg-white rounded-xl border p-4 space-y-3 lg:col-span-1">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs text-slate-500">
                                            Decrypted Payload
                                        </div>
                                        <div className="font-semibold">
                                            Bordro içeriği
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleDecrypt}
                                        disabled={decryptState.loading}
                                        className="px-3 py-1 text-xs rounded bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-60"
                                    >
                                        {decryptState.loading
                                            ? "Çözümleniyor..."
                                            : "Decrypt"}
                                    </button>
                                </div>

                                {decryptState.error && (
                                    <div className="text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded">
                                        {decryptState.error}
                                    </div>
                                )}

                                {decryptState.payload ? (
                                    <div className="text-xs space-y-1">
                                        {"period_start" in
                                            decryptState.payload && (
                                                <div>
                                                    <span className="font-medium">
                                                        Period Start:{" "}
                                                    </span>
                                                    {
                                                        decryptState.payload
                                                            .period_start
                                                    }
                                                </div>
                                            )}
                                        {"period_end" in
                                            decryptState.payload && (
                                                <div>
                                                    <span className="font-medium">
                                                        Period End:{" "}
                                                    </span>
                                                    {
                                                        decryptState.payload
                                                            .period_end
                                                    }
                                                </div>
                                            )}
                                        {"gross_salary" in
                                            decryptState.payload && (
                                                <div>
                                                    <span className="font-medium">
                                                        Gross Salary:{" "}
                                                    </span>
                                                    {
                                                        decryptState.payload
                                                            .gross_salary
                                                    }
                                                </div>
                                            )}
                                        {"net_salary" in
                                            decryptState.payload && (
                                                <div>
                                                    <span className="font-medium">
                                                        Net Salary:{" "}
                                                    </span>
                                                    {
                                                        decryptState.payload
                                                            .net_salary
                                                    }
                                                </div>
                                            )}

                                        <details className="mt-2">
                                            <summary className="cursor-pointer text-slate-600">
                                                Tüm JSON&apos;u göster
                                            </summary>
                                            <pre className="mt-1 p-2 bg-slate-100 rounded text-[11px] overflow-auto max-h-64">
                                                {JSON.stringify(
                                                    decryptState.payload,
                                                    null,
                                                    2
                                                )}
                                            </pre>
                                        </details>
                                    </div>
                                ) : !decryptState.loading ? (
                                    <div className="text-xs text-slate-400">
                                        Henüz çözülmedi. Decrypt butonuna bas.
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
