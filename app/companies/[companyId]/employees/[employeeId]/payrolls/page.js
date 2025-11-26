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
        gross_salary: "",
        net_salary: "",
    });

    // ---- Payrolls Fetch ----
    useEffect(() => {
        if (!ready) return;

        const load = async () => {
            try {
                setLoading(true);
                const data = await fetchPayrolls(companyId, employeeId);
                const list = Array.isArray(data) ? data : data.data || [];
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

    // ---- Create Payroll ----
    const handleCreate = async () => {
        setCreating(true);
        setError("");

        try {
            const payload = {
                ...form,
                gross_salary: Number(form.gross_salary),
                net_salary: Number(form.net_salary),
                payload: { note: "Payroll metadata" },
            };

            await createPayrollApi(companyId, employeeId, payload);

            // refresh list
            const updated = await fetchPayrolls(companyId, employeeId);
            setPayrolls(updated.data || updated);

            setForm({
                period_start: "",
                period_end: "",
                gross_salary: "",
                net_salary: "",
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
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

                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="date"
                                className="border p-2 rounded"
                                placeholder="Period Start"
                                value={form.period_start}
                                onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                            />
                            <input
                                type="date"
                                className="border p-2 rounded"
                                placeholder="Period End"
                                value={form.period_end}
                                onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                            />
                            <input
                                type="number"
                                className="border p-2 rounded"
                                placeholder="Gross Salary"
                                value={form.gross_salary}
                                onChange={(e) => setForm({ ...form, gross_salary: e.target.value })}
                            />
                            <input
                                type="number"
                                className="border p-2 rounded"
                                placeholder="Net Salary"
                                value={form.net_salary}
                                onChange={(e) => setForm({ ...form, net_salary: e.target.value })}
                            />
                        </div>

                        <button
                            disabled={creating}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            onClick={handleCreate}
                        >
                            {creating ? "Oluşturuluyor..." : "Oluştur"}
                        </button>
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
                                                {p.nft ? (
                                                    <div className="space-y-1">
                                                        <div className="text-xs">{badge(p.nft.status)}</div>

                                                        {p.nft.ipfs_cid && (
                                                            <a
                                                                className="text-blue-600 underline text-xs"
                                                                href={`https://ipfs.io/ipfs/${p.nft.ipfs_cid}`}
                                                                target="_blank"
                                                            >
                                                                IPFS Metadata
                                                            </a>
                                                        )}

                                                        {p.nft.tx_hash && (
                                                            <a
                                                                className="text-green-600 underline text-xs"
                                                                href={`https://sepolia.etherscan.io/tx/${p.nft.tx_hash}`}
                                                                target="_blank"
                                                            >
                                                                Etherscan
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>

                                            <td className="p-2 space-x-2">
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
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
