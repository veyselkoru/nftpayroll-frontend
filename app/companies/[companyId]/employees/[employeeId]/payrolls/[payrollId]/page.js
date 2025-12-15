"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import { useToast } from "@/app/components/ToastProvider";

import {
    fetchPayrolls,
    decryptPayrollApi,
    queuePayrollApi,
    retryMintApi,
} from "@/lib/payrolls";

export default function PayrollDetailPage() {
    const ready = useAuthGuard();
    const router = useRouter();
    const { companyId, employeeId, payrollId } = useParams();

    const [payroll, setPayroll] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { showToast } = useToast();


    const [decryptModal, setDecryptModal] = useState({
        open: false,
        loading: false,
        error: "",
        payload: null,
    });

    useEffect(() => {
        if (!ready) return;

        const load = async () => {
            try {
                setLoading(true);
                setError("");

                // Basit çözüm: çalışan tüm payrollları çek, id ile bul
                const data = await fetchPayrolls(companyId, employeeId);
                const list = Array.isArray(data) ? data : data.data || [];
                const found = list.find((p) => String(p.id) === String(payrollId));

                if (!found) {
                    setError("Payroll bulunamadı");
                } else {
                    setPayroll(found);
                }
            } catch (err) {
                setError(err.message || "Detay yüklenirken hata oluştu.");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [ready, companyId, employeeId, payrollId]);

    const handleDecrypt = async () => {
        if (!payroll) return;

        setDecryptModal({
            open: true,
            loading: true,
            error: "",
            payload: null,
        });

        try {
            const res = await decryptPayrollApi(companyId, employeeId, payroll.id);
            setDecryptModal({
                open: true,
                loading: false,
                error: "",
                payload: res.decrypted_payload || res.payload || null,
            });
        } catch (err) {
            setDecryptModal({
                open: true,
                loading: false,
                error: err.message || "Decrypt failed",
                payload: null,
            });
        }
    };

    const closeDecryptModal = () => {
        setDecryptModal({
            open: false,
            loading: false,
            error: "",
            payload: null,
        });
    };

    const handleQueueMint = async () => {
        if (!payroll) return;
        try {
            await queuePayrollApi(companyId, employeeId, payroll.id);
            showToast("Mint kuyruğa eklendi", "success");
        } catch (err) {
            showToast(err.message || "Bir hata oluştu.", "error");
        }
    };

    const handleRetryMint = async () => {
        if (!payroll) return;
        try {
            await retryMintApi(companyId, employeeId, payroll.id);
            showToast("Mint tekrar kuyruğa eklendi", "success");
        } catch (err) {
            showToast(err.message || "Bir hata oluştu.", "error");
        }
    };

    const badge = (status) => {
        const colors = {
            pending: "bg-yellow-100 text-yellow-700",
            queued: "bg-blue-100 text-blue-700",
            minted: "bg-green-100 text-green-700",
            mint_failed: "bg-red-100 text-red-700",
            sending: "bg-blue-100 text-blue-700",
            sent: "bg-green-100 text-green-700",
            failed: "bg-red-100 text-red-700",
        };

        return (
            <span
                className={`px-2 py-1 text-xs rounded ${colors[status] || "bg-gray-200 text-gray-700"
                    }`}
            >
                {status}
            </span>
        );
    };

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
                Yükleniyor...
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex bg-slate-100">
                <Sidebar />
                <div className="flex-1 flex flex-col">
                    <Navbar />
                    <main className="p-6">
                        <div className="text-sm text-slate-500">Detay yükleniyor...</div>
                    </main>
                </div>
            </div>
        );
    }

    if (error || !payroll) {
        return (
            <div className="min-h-screen flex bg-slate-100">
                <Sidebar />
                <div className="flex-1 flex flex-col">
                    <Navbar />
                    <main className="p-6 space-y-3">
                        <button
                            onClick={() =>
                                router.push(
                                    `/companies/${companyId}/employees/${employeeId}/payrolls`
                                )
                            }
                            className="text-xs px-3 py-1 bg-slate-900 text-white rounded"
                        >
                            ← Listeye Dön
                        </button>
                        <div className="bg-red-100 text-red-700 border border-red-300 px-4 py-2 rounded text-sm">
                            {error || "Payroll bulunamadı."}
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    const nft = payroll.nft || payroll.nftMint || null;
    const imageUrl = nft?.image_url || "/placeholder-nft.png";

    return (
        <div className="min-h-screen flex bg-slate-100">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <Navbar />

                <main className="p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold">
                                Payroll Detay #{payroll.id}
                            </h1>
                            <p className="text-xs text-slate-500">
                                Çalışan ID: {payroll.employee_id}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() =>
                                    router.push(
                                        `/companies/${companyId}/employees/${employeeId}/payrolls`
                                    )
                                }
                                className="text-xs px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                            >
                                ← Listeye Dön
                            </button>
                        </div>
                    </div>

                    {/* Ana içerik: 2 kolon */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Sol: NFT Kartı */}
                        <div className="bg-white rounded-lg shadow border p-4 space-y-4">
                            <h2 className="font-semibold text-sm mb-1">NFT</h2>

                            {nft ? (
                                <>
                                    <div className="w-full rounded-lg overflow-hidden border bg-slate-50">
                                        <img
                                            src={imageUrl}
                                            alt="Payroll NFT"
                                            className="w-full h-64 object-cover"
                                        />
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">Status</span>
                                            {badge(nft.status)}
                                        </div>

                                        {nft.token_id && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-600">Token ID</span>
                                                <span className="font-medium">
                                                    {nft.token_id}
                                                </span>
                                            </div>
                                        )}

                                        {nft.tx_hash && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-600">Tx Hash</span>
                                                <button
                                                    onClick={() =>
                                                        navigator.clipboard.writeText(
                                                            nft.tx_hash
                                                        )
                                                    }
                                                    className="text-xs text-blue-600 underline"
                                                >
                                                    Kopyala
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-1 mt-2">
                                            {nft.ipfs_cid && (
                                                <a
                                                    href={`https://ipfs.io/ipfs/${nft.ipfs_cid}`}
                                                    target="_blank"
                                                    className="text-xs text-blue-600 underline"
                                                >
                                                    IPFS Metadata
                                                </a>
                                            )}

                                            {nft.tx_hash && (
                                                <a
                                                    href={`https://sepolia.etherscan.io/tx/${nft.tx_hash}`}
                                                    target="_blank"
                                                    className="text-xs text-green-600 underline"
                                                >
                                                    Etherscan
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={handleQueueMint}
                                            className="flex-1 text-xs px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                        >
                                            Tekrar Queue
                                        </button>
                                        <button
                                            onClick={handleRetryMint}
                                            className="flex-1 text-xs px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                        >
                                            Retry Mint
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-sm text-slate-500">
                                    Bu payroll için henüz NFT mint edilmemiş.
                                    <div className="mt-2">
                                        <button
                                            onClick={handleQueueMint}
                                            className="text-xs px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                        >
                                            Queue Mint
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sağ: Bordro Bilgileri */}
                        <div className="bg-white rounded-lg shadow border p-4 space-y-4">
                            <h2 className="font-semibold text-sm mb-1">Bordro Bilgileri</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div>
                                    <div className="text-slate-500 text-xs">
                                        Dönem Başlangıç
                                    </div>
                                    <div>{payroll.period_start}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500 text-xs">
                                        Dönem Bitiş
                                    </div>
                                    <div>{payroll.period_end}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500 text-xs">Ödeme Tarihi</div>
                                    <div>{payroll.payment_date || "-"}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500 text-xs">Para Birimi</div>
                                    <div>{payroll.currency || "TRY"}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div>
                                    <div className="text-slate-500 text-xs">Brüt Ücret</div>
                                    <div>{payroll.gross_salary}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500 text-xs">Net Ücret</div>
                                    <div>{payroll.net_salary}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500 text-xs">Bonus / Prim</div>
                                    <div>{payroll.bonus ?? "-"}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500 text-xs">Toplam Kesinti</div>
                                    <div>{payroll.deductions_total ?? "-"}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-2">
                                <div>
                                    <div className="text-slate-500 text-xs">
                                        İmzalayan (Ad Soyad)
                                    </div>
                                    <div>{payroll.employer_sign_name || "-"}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500 text-xs">
                                        İmzalayan Ünvan
                                    </div>
                                    <div>{payroll.employer_sign_title || "-"}</div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">
                                        Şifrelenmiş Payload
                                    </span>
                                    <button
                                        onClick={handleDecrypt}
                                        className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                                    >
                                        Decrypt Et
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Bu bordro içeriği zincire şifreli olarak yazılmıştır. Decrypt
                                    ederek düz metin halini görebilirsin (sadece şirket sahibi).
                                </p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Decrypt Modal */}
            {decryptModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-lg">
                                Decrypted Payroll #{payroll.id}
                            </h2>
                            <button
                                onClick={closeDecryptModal}
                                className="text-sm text-slate-500 hover:text-slate-700"
                            >
                                ✕
                            </button>
                        </div>

                        {decryptModal.loading && (
                            <div className="text-sm text-slate-500">
                                Çözümleniyor...
                            </div>
                        )}

                        {decryptModal.error && (
                            <div className="text-sm text-red-600">
                                {decryptModal.error}
                            </div>
                        )}

                        {!decryptModal.loading &&
                            !decryptModal.error &&
                            decryptModal.payload && (
                                <div className="space-y-2 text-sm">
                                    {"period_start" in decryptModal.payload && (
                                        <div>
                                            <span className="font-medium">
                                                Period Start:{" "}
                                            </span>
                                            {decryptModal.payload.period_start}
                                        </div>
                                    )}

                                    {"period_end" in decryptModal.payload && (
                                        <div>
                                            <span className="font-medium">
                                                Period End:{" "}
                                            </span>
                                            {decryptModal.payload.period_end}
                                        </div>
                                    )}

                                    {"gross_salary" in decryptModal.payload && (
                                        <div>
                                            <span className="font-medium">
                                                Gross Salary:{" "}
                                            </span>
                                            {decryptModal.payload.gross_salary}
                                        </div>
                                    )}

                                    {"net_salary" in decryptModal.payload && (
                                        <div>
                                            <span className="font-medium">
                                                Net Salary:{" "}
                                            </span>
                                            {decryptModal.payload.net_salary}
                                        </div>
                                    )}

                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-slate-600">
                                            Tüm payload (JSON)
                                        </summary>
                                        <pre className="mt-1 p-2 bg-slate-100 rounded text-xs overflow-auto">
                                            {JSON.stringify(
                                                decryptModal.payload,
                                                null,
                                                2
                                            )}
                                        </pre>
                                    </details>
                                </div>
                            )}
                    </div>
                </div>
            )}
        </div>
    );
}
