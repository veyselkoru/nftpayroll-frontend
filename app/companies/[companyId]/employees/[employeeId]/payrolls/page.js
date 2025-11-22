"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import {
    fetchPayrolls,
    createPayrollApi,
    queuePayrollApi,
    payrollStatusApi,
    retryMintApi,
} from "@/lib/payrolls";

function StatusBadge({ status }) {
    const map = {
        created: "Hazırlandı",
        queued: "Kuyrukta",
        processing: "İşleniyor",
        minting: "Mint ediliyor",
        minted: "Mint edildi",
        failed: "Hata",
    };

    const colorClass = {
        created: "bg-slate-100 text-slate-700",
        queued: "bg-amber-100 text-amber-800",
        processing: "bg-blue-100 text-blue-800",
        minting: "bg-blue-100 text-blue-800",
        minted: "bg-emerald-100 text-emerald-800",
        failed: "bg-red-100 text-red-800",
    }[status] || "bg-slate-100 text-slate-700";

    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${colorClass}`}
        >
            {map[status] || status || "-"}
        </span>
    );
}

export default function PayrollsPage() {
    const { companyId, employeeId } = useParams();
    const router = useRouter();

    const [payrolls, setPayrolls] = useState([]);
    const [form, setForm] = useState({
        period_start: "",
        period_end: "",
        gross_salary: "",
        net_salary: "",
    });
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [error, setError] = useState("");
    const [statusMap, setStatusMap] = useState({}); // /status responsunu ayrı tutmak için

    // Sayfa açıldığında payroll’ları çek
    useEffect(() => {
        const token =
            typeof window !== "undefined" && localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        setLoading(true);
        fetchPayrolls(companyId, employeeId)
            .then((data) => {
                const list = Array.isArray(data) ? data : data.data || [];
                setPayrolls(list);
            })
            .catch((err) => {
                setError(err.message);
                if (err.message.toLowerCase().includes("unauth")) {
                    router.push("/login");
                }
            })
            .finally(() => setLoading(false));
    }, [companyId, employeeId, router]);

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.period_start || !form.period_end || !form.gross_salary) return;

        setError("");
        try {
            const payload = {
                period_start: form.period_start,
                period_end: form.period_end,
                gross_salary: form.gross_salary,
                net_salary: form.net_salary,
            };

            const created = await createPayrollApi(
                companyId,
                employeeId,
                payload
            );

            setPayrolls((prev) => [...prev, created]);
            setForm({
                period_start: "",
                period_end: "",
                gross_salary: "",
                net_salary: "",
            });
        } catch (err) {
            setError(err.message);
        }
    };

    // Queue endpoint
    const handleQueue = async (id) => {
        setError("");
        setActionLoadingId(id);
        try {
            await queuePayrollApi(companyId, employeeId, id);
            // Backend, payroll.status alanını güncelliyorsa buradan tekrar liste çekebilirsin:
            const data = await fetchPayrolls(companyId, employeeId);
            const list = Array.isArray(data) ? data : data.data || [];
            setPayrolls(list);
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoadingId(null);
        }
    };

    // Status endpoint
    const handleStatus = async (id) => {
        setError("");
        setActionLoadingId(id);
        try {
            const statusResp = await payrollStatusApi(companyId, employeeId, id);
            // responsu olduğu gibi map’te tutuyoruz, hem status string’ini hem raw JSON’u gösterebiliriz
            setStatusMap((prev) => ({ ...prev, [id]: statusResp }));
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoadingId(null);
        }
    };

    // Mint retry endpoint
    const handleRetryMint = async (id) => {
        setError("");
        setActionLoadingId(id);
        try {
            await retryMintApi(companyId, employeeId, id);
            // Retry sonrası da listeyi tazelemek güzel olur
            const data = await fetchPayrolls(companyId, employeeId);
            const list = Array.isArray(data) ? data : data.data || [];
            setPayrolls(list);
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-100">
            <Sidebar />

            <div className="flex flex-col flex-1 min-w-0">
                <Navbar />

                <main className="flex-1 px-6 py-6 max-w-12xl w-full mx-auto space-y-6">
                    {/* Başlık */}
                    <div>
                        <p className="text-xs text-slate-500 mb-1">
                            Şirket #{companyId} / Çalışan #{employeeId} / Payrolllar
                        </p>
                        <h1 className="text-2xl font-bold">Payrolllar</h1>
                        <p className="text-sm text-slate-500">
                            Bu sayfadan seçili çalışanın maaş bordrolarını yönetebilirsin.
                        </p>
                    </div>

                    {error && (
                        <p className="text-xs text-red-600">{error}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Sol: yeni payroll formu */}
                        <div className="bg-white rounded-xl border p-4 md:col-span-1">
                            <h2 className="font-semibold mb-3 text-sm">
                                Yeni Payroll Oluştur
                            </h2>

                            <form className="space-y-3" onSubmit={handleSubmit}>
                                <div className="space-y-1 text-sm">
                                    <label className="text-slate-600">Dönem Başlangıç</label>
                                    <input
                                        type="date"
                                        name="period_start"
                                        value={form.period_start}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm"
                                    />
                                </div>

                                <div className="space-y-1 text-sm">
                                    <label className="text-slate-600">Dönem Bitiş</label>
                                    <input
                                        type="date"
                                        name="period_end"
                                        value={form.period_end}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm"
                                    />
                                </div>

                                <div className="space-y-1 text-sm">
                                    <label className="text-slate-600">Brüt Maaş</label>
                                    <input
                                        name="gross_salary"
                                        value={form.gross_salary}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm"
                                        placeholder="150000"
                                    />
                                </div>

                                <div className="space-y-1 text-sm">
                                    <label className="text-slate-600">
                                        Net Maaş (opsiyonel)
                                    </label>
                                    <input
                                        name="net_salary"
                                        value={form.net_salary}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm"
                                        placeholder="120000"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-slate-900 text-white rounded py-2 text-sm hover:bg-slate-800"
                                >
                                    Kaydet
                                </button>
                            </form>
                        </div>

                        {/* Sağ: payroll listesi */}
                        <div className="bg-white rounded-xl border p-4 md:col-span-3">
                            <h2 className="font-semibold mb-3 text-sm">
                                Payroll Listesi
                            </h2>

                            {loading ? (
                                <p className="text-sm text-slate-500">Yükleniyor...</p>
                            ) : payrolls.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    Henüz payroll yok. Soldaki formdan ekleyebilirsin.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-xs text-slate-500">
                                                <th className="text-left py-2 pr-4">ID</th>
                                                <th className="text-left py-2 pr-4">Dönem</th>
                                                <th className="text-left py-2 pr-4">Brüt</th>
                                                <th className="text-left py-2 pr-4">Net</th>
                                                <th className="text-left py-2 pr-4">Durum</th>
                                                <th className="text-left py-2">Aksiyonlar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payrolls.map((p) => (
                                                <tr
                                                    key={p.id}
                                                    className="border-b last:border-0 hover:bg-slate-50 align-top"
                                                >
                                                    <td className="py-2 pr-4 text-xs text-slate-500">
                                                        #{p.id}
                                                    </td>
                                                    <td className="py-2 pr-4 text-xs">
                                                        {p.period_start} → {p.period_end}
                                                    </td>
                                                    <td className="py-2 pr-4 text-xs">
                                                        {p.gross_salary} ₺
                                                    </td>
                                                    <td className="py-2 pr-4 text-xs">
                                                        {p.net_salary} ₺
                                                    </td>
                                                    <td className="py-2 pr-4 text-xs">
                                                        <StatusBadge status={p.status} />
                                                        {statusMap[p.id] && (
                                                            <div className="mt-1 text-[10px] text-slate-500 font-mono break-all max-w-xs">
                                                                {/* status endpoint'inden gelen raw json'u küçük yazıyla gösteriyoruz */}
                                                                {JSON.stringify(statusMap[p.id])}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-2">
                                                        <div className="flex flex-wrap gap-1">
                                                            <button
                                                                className="text-[11px] border rounded px-2 py-1 hover:bg-slate-100"
                                                                onClick={() => handleQueue(p.id)}
                                                                disabled={actionLoadingId === p.id}
                                                            >
                                                                Queue
                                                            </button>
                                                            <button
                                                                className="text-[11px] border rounded px-2 py-1 hover:bg-slate-100"
                                                                onClick={() => handleStatus(p.id)}
                                                                disabled={actionLoadingId === p.id}
                                                            >
                                                                Status
                                                            </button>
                                                            <button
                                                                className="text-[11px] border rounded px-2 py-1 hover:bg-slate-100"
                                                                onClick={() => handleRetryMint(p.id)}
                                                                disabled={actionLoadingId === p.id}
                                                            >
                                                                Mint Retry
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
