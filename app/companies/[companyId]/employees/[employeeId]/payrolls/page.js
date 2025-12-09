"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";

import {
    fetchPayrolls,
    createPayrollApi,
    queuePayrollApi,
    payrollStatusApi,
    retryMintApi,
    decryptPayrollApi
} from "@/lib/payrolls";

export default function PayrollsPage() {
    const ready = useAuthGuard();

    // ---- HOOK'lar (konum önemli) ----
    const { companyId, employeeId } = useParams();
    const router = useRouter();

    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");
    const [autoRefresh, setAutoRefresh] = useState(false);


    const [form, setForm] = useState({
        period_start: "",
        period_end: "",
        payment_date: "",
        currency: "TRY",
        gross_salary: "",
        net_salary: "",
        bonus: "",
        deductions_total: "",
        employer_sign_name: "",
        employer_sign_title: "",
    });

    const [decryptModal, setDecryptModal] = useState({
        open: false,
        loading: false,
        error: "",
        payload: null,
        payrollId: null,
    });


    // ---- Payrolls Fetch ----
    useEffect(() => {
        if (!ready) return;

        const load = async () => {
            try {
                setLoading(true);
                const data = await fetchPayrolls(companyId, employeeId);
                const list = Array.isArray(data) ? data : data.data || [];
                console.log(list)
                setPayrolls(list);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [ready, companyId, employeeId]);

    useEffect(() => {
        if (!ready) return;
        if (!autoRefresh) return;

        const id = setInterval(() => {
            refreshPayrolls().catch(() => { });
        }, 5000); // 5 saniyede bir güncelle

        return () => clearInterval(id);
    }, [ready, autoRefresh, companyId, employeeId]);

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });


    // ---- Create Payroll ----
    // ---- Create Payroll ----
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.period_start || !form.period_end) return;

        setError("");
        try {
            const payload = {
                period_start: form.period_start,
                period_end: form.period_end,
                payment_date: form.payment_date || null,
                currency: form.currency || "TRY",
                gross_salary: parseFloat(form.gross_salary || 0),
                net_salary: parseFloat(form.net_salary || 0),
                bonus: form.bonus ? parseFloat(form.bonus) : null,
                deductions_total: form.deductions_total
                    ? parseFloat(form.deductions_total)
                    : null,
                employer_sign_name: form.employer_sign_name || null,
                employer_sign_title: form.employer_sign_title || null,
            };

            // 🔴 BURADA createPayroll DEĞİL, createPayrollApi KULLANACAĞIZ
            const created = await createPayrollApi(companyId, employeeId, payload);
            const item = created?.data || created;

            setPayrolls((prev) => [...prev, item]);

            setForm({
                period_start: "",
                period_end: "",
                payment_date: "",
                currency: "TRY",
                gross_salary: "",
                net_salary: "",
                bonus: "",
                deductions_total: "",
                employer_sign_name: "",
                employer_sign_title: "",
            });
        } catch (err) {
            console.error(err);
            setError(err.message || "Kayıt sırasında hata oluştu.");
        }
    };


    // ---- Queue Mint ----
    const handleQueueMint = async (payrollId) => {
        try {
            await queuePayrollApi(companyId, employeeId, payrollId);
            setAutoRefresh(true);      // 🔹 hemen başlasın
            refreshPayrolls();
        } catch (err) {
            alert(err.message);
        }
    };



    const refreshPayrolls = async () => {
        const data = await fetchPayrolls(companyId, employeeId);
        const list = data.data || data;

        setPayrolls(list);

        // 🔹 Auto refresh'e karar ver:
        const shouldKeepRefreshing = list.some((p) => {
            // Bordro hâlâ mint sürecinde mi?
            if (p.status === "queued" || p.status === "pending") return true;
            if (p.nft && p.nft.status && p.nft.status !== "sent" && p.nft.status !== "failed") {
                return true;
            }
            return false;
        });

        setAutoRefresh(shouldKeepRefreshing);
    };

    // ---- Update Status ----
    const handleStatus = async (payrollId) => {
        try {
            const res = await payrollStatusApi(companyId, employeeId, payrollId);
            alert("Güncel durum: " + JSON.stringify(res, null, 2));
            refreshPayrolls();
        } catch (err) {
            alert(err.message);
        }
    };

    // ---- Retry Mint ----
    const handleRetry = async (payrollId) => {
        try {
            await retryMintApi(companyId, employeeId, payrollId);
            setAutoRefresh(true);      // 🔹 tekrar takip et
            refreshPayrolls();
        } catch (err) {
            alert(err.message);
        }
    };

    // ---- Status Badge ----
    const badge = (status) => {
        const colors = {
            pending: "bg-yellow-100 text-yellow-700",
            queued: "bg-blue-100 text-blue-700",
            minted: "bg-green-100 text-green-700",
            mint_failed: "bg-red-100 text-red-700",
        };

        return (
            <span className={`px-2 py-1 text-xs rounded ${colors[status] || "bg-gray-200"}`}>
                {status}
            </span>
        );
    };


    const handleDecrypt = async (payrollId) => {
        setDecryptModal({
            open: true,
            loading: true,
            error: "",
            payload: null,
            payrollId,
        });

        try {
            const res = await decryptPayrollApi(companyId, employeeId, payrollId);
            // Backend response:
            // { payroll_id, employee_id, decrypted_payload: { ... } }

            setDecryptModal((prev) => ({
                ...prev,
                loading: false,
                payload: res.decrypted_payload || res.payload || null,
            }));
        } catch (err) {
            setDecryptModal((prev) => ({
                ...prev,
                loading: false,
                error: err.message || "Decrypt failed",
            }));
        }
    };

    const closeDecryptModal = () => {
        setDecryptModal({
            open: false,
            loading: false,
            error: "",
            payload: null,
            payrollId: null,
        });
    };



    // ---- Render (guard) ----
    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
                Yükleniyor...
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-slate-100">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <Navbar />

                <main className="p-6 space-y-6">
                    <h1 className="text-xl font-semibold">Payrolls</h1>

                    {error && (
                        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded">
                            {error}
                        </div>
                    )}

                    {/* ----- CREATE ----- */}
                    <div className="bg-white p-4 rounded shadow border space-y-3">
                        <h2 className="font-semibold text-lg">Yeni Payroll Oluştur</h2>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div className="space-y-1">
                                    <label className="text-slate-600">Dönem Başlangıç</label>
                                    <input
                                        type="date"
                                        name="period_start"
                                        value={form.period_start}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-600">Dönem Bitiş</label>
                                    <input
                                        type="date"
                                        name="period_end"
                                        value={form.period_end}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-600">Ödeme Tarihi</label>
                                    <input
                                        type="date"
                                        name="payment_date"
                                        value={form.payment_date}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div className="space-y-1">
                                    <div className="w-full flex gap-3 text-sm">
                                        <div className="space-y-1 w-auto">
                                            <label className="text-slate-600">Para Birimi</label>
                                            <select
                                                name="currency"
                                                value={form.currency}
                                                onChange={handleChange}
                                                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                            >
                                                <option value="TRY">TRY</option>
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                            </select>
                                        </div>


                                        <div className="space-y-1 flex-1">
                                            <label className="text-slate-600">Brüt Ücret</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="gross_salary"
                                                value={form.gross_salary}
                                                onChange={handleChange}
                                                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-slate-600">Net Ücret</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="net_salary"
                                        value={form.net_salary}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-600">Bonus / Prim</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="bonus"
                                        value={form.bonus}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                        placeholder="Opsiyonel"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div className="space-y-1">
                                    <label className="text-slate-600">Toplam Kesinti</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="deductions_total"
                                        value={form.deductions_total}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                        placeholder="Opsiyonel"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-600">İmzalayan (Ad Soyad)</label>
                                    <input
                                        name="employer_sign_name"
                                        value={form.employer_sign_name}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                        placeholder="Örn: Ayşe Demir"
                                    />
                                </div>

                                <div className="space-y-1 text-sm">
                                    <label className="text-slate-600">İmzalayan Ünvan</label>
                                    <input
                                        name="employer_sign_title"
                                        value={form.employer_sign_title}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                        placeholder="Örn: İK Müdürü"
                                    />
                                </div>
                            </div>



                            <button
                                type="submit"
                                className="w-full bg-slate-900 text-white rounded py-2 text-sm hover:bg-slate-800"
                            >
                                Kaydet
                            </button>
                        </form>

                    </div>

                    {/* ----- LIST ----- */}
                    <div className="bg-white p-4 rounded shadow border">
                        <h2 className="font-semibold text-lg mb-4">Payroll Listesi</h2>

                        {loading ? (
                            <div className="text-slate-500 text-sm">Yükleniyor...</div>
                        ) : payrolls.length === 0 ? (
                            <div className="text-slate-500 text-sm">Henüz payroll yok.</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="p-2 text-left">ID</th>
                                        <th className="p-2 text-left">Dönem</th>
                                        <th className="p-2 text-left">Tutar</th>
                                        <th className="p-2 text-left">Status</th>
                                        <th className="p-2 text-left">NFT</th>
                                        <th className="p-2 text-left">Aksiyonlar</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {payrolls.map((p) => (
                                        <tr key={p.id} className="border-b">
                                            <td className="p-2">{p.id}</td>
                                            <td className="p-2">
                                                {p.period_start} → {p.period_end}
                                            </td>
                                            <td className="p-2">{p.net_salary}</td>
                                            <td className="p-2">{badge(p.status)}</td>

                                            <td className="p-2">
                                                {!p.nft ? (
                                                    <span className="text-xs text-slate-400">Mint edilmedi</span>
                                                ) : (
                                                    <div className="border rounded-md p-2 bg-slate-50 shadow-sm space-y-2 w-44">

                                                        {/* NFT Görseli */}
                                                        {p.nft.token_id ? (
                                                            <img
                                                                src={p.nft.image_url || "/placeholder-nft.png"}
                                                                alt="NFT"
                                                                className="w-full h-24 object-cover rounded"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-24 bg-slate-200 rounded animate-pulse" />
                                                        )}

                                                        <div className="text-xs space-y-1">

                                                            {/* Status */}
                                                            <div className="flex items-center gap-2">
                                                                {badge(p.nft.status)}
                                                            </div>

                                                            {/* Token ID */}
                                                            {p.nft.token_id && (
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-slate-600">Token ID:</span>
                                                                    <span className="font-medium">{p.nft.token_id}</span>
                                                                </div>
                                                            )}

                                                            {/* IPFS Link */}
                                                            {p.nft.ipfs_cid && (
                                                                <a
                                                                    href={`https://ipfs.io/ipfs/${p.nft.ipfs_cid}`}
                                                                    target="_blank"
                                                                    className="text-blue-600 underline block"
                                                                >
                                                                    Metadata
                                                                </a>
                                                            )}

                                                            {/* Etherscan */}
                                                            {p.nft.tx_hash && (
                                                                <a
                                                                    href={`https://sepolia.etherscan.io/tx/${p.nft.tx_hash}`}
                                                                    target="_blank"
                                                                    className="text-green-600 underline block"
                                                                >
                                                                    Etherscan
                                                                </a>
                                                            )}

                                                            {/* Copy Token ID */}
                                                            {p.nft.token_id && (
                                                                <button
                                                                    onClick={() => navigator.clipboard.writeText(p.nft.token_id.toString())}
                                                                    className="text-slate-500 underline text-xs hover:text-slate-700"
                                                                >
                                                                    Kopyala
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>


                                            <td className="p-2 space-x-2">
                                                {/* DETAY */}
                                                <button
                                                    onClick={() =>
                                                        router.push(
                                                            `/companies/${companyId}/employees/${employeeId}/payrolls/${p.id}`
                                                        )
                                                    }
                                                    className="text-xs px-2 py-1 bg-slate-900 text-white rounded hover:bg-slate-800"
                                                >
                                                    Detay
                                                </button>
                                                {/* QUEUE */}
                                                <button
                                                    onClick={() => handleQueueMint(p.id)}
                                                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                                >
                                                    Queue
                                                </button>

                                                {/* STATUS */}
                                                <button
                                                    onClick={() => handleStatus(p.id)}
                                                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                                >
                                                    Status
                                                </button>

                                                {/* RETRY */}
                                                <button
                                                    onClick={() => handleRetry(p.id)}
                                                    className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                                                >
                                                    Retry Mint
                                                </button>

                                                <button
                                                    onClick={() => handleDecrypt(p.id)}
                                                    className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                                                >
                                                    Decrypt
                                                </button>

                                                {/* <button
                                                    onClick={() =>
                                                        router.push(
                                                            `/companies/${companyId}/employees/${e.id}/nfts/${p.id}`
                                                        )
                                                    }
                                                    className="text-xs px-2 py-1 bg-cyan-100 text-cyan-700 rounded hover:bg-cyan-200"
                                                >
                                                    NFT
                                                </button> */}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>
            </div>


            {decryptModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-lg">
                                Decrypted Payroll #{decryptModal.payrollId}
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

                        {!decryptModal.loading && !decryptModal.error && decryptModal.payload && (
                            <div className="space-y-2 text-sm">
                                {/* Backend’te encrypted payload’a ne koyduysan ona göre gösteriyoruz */}
                                {"period_start" in decryptModal.payload && (
                                    <div>
                                        <span className="font-medium">Period Start: </span>
                                        {decryptModal.payload.period_start}
                                    </div>
                                )}

                                {"period_end" in decryptModal.payload && (
                                    <div>
                                        <span className="font-medium">Period End: </span>
                                        {decryptModal.payload.period_end}
                                    </div>
                                )}

                                {"gross_salary" in decryptModal.payload && (
                                    <div>
                                        <span className="font-medium">Gross Salary: </span>
                                        {decryptModal.payload.gross_salary}
                                    </div>
                                )}

                                {"net_salary" in decryptModal.payload && (
                                    <div>
                                        <span className="font-medium">Net Salary: </span>
                                        {decryptModal.payload.net_salary}
                                    </div>
                                )}

                                {/* Diğer key’ler için generic JSON da basabiliriz */}
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-slate-600">
                                        Tüm payload (JSON)
                                    </summary>
                                    <pre className="mt-1 p-2 bg-slate-100 rounded text-xs overflow-auto">
                                        {JSON.stringify(decryptModal.payload, null, 2)}
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
