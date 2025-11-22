"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { listEmployeeNfts } from "@/lib/employees";

function StatusBadge({ status }) {
    const label =
        status === "minted"
            ? "Mint edildi"
            : status === "pending"
                ? "Bekliyor"
                : status === "failed"
                    ? "Hata"
                    : status || "-";

    const colorClass =
        status === "minted"
            ? "bg-emerald-100 text-emerald-800"
            : status === "pending"
                ? "bg-amber-100 text-amber-800"
                : status === "failed"
                    ? "bg-red-100 text-red-800"
                    : "bg-slate-100 text-slate-700";

    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${colorClass}`}
        >
            {label}
        </span>
    );
}

export default function EmployeeNftsPage() {
    const { companyId, employeeId } = useParams();
    const [nfts, setNfts] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const token =
            typeof window !== "undefined" && localStorage.getItem("token");
        if (!token) {
            // token yoksa login'e at
            window.location.href = "/login";
            return;
        }

        setLoading(true);
        listEmployeeNfts(companyId, employeeId)
            .then((data) => {
                const list = Array.isArray(data) ? data : data.data || [];
                setNfts(list);
                setSelected(list[0] || null);
            })
            .catch((err) => {
                setError(err.message || "NFT listesi alınamadı");
            })
            .finally(() => setLoading(false));
    }, [companyId, employeeId]);

    return (
        <div className="min-h-screen flex bg-slate-100">
            <Sidebar />

            <div className="flex flex-col flex-1 min-w-0">
                <Navbar />

                <main className="flex-1 px-6 py-6 max-w-6xl w-full mx-auto space-y-6">
                    {/* Başlık */}
                    <div>
                        <p className="text-xs text-slate-500 mb-1">
                            Şirket #{companyId} / Çalışan #{employeeId} / NFT&apos;ler
                        </p>
                        <h1 className="text-2xl font-bold">Payroll NFT&apos;leri</h1>
                        <p className="text-sm text-slate-500">
                            Bu sayfada seçili çalışanın mint edilen payroll NFT&apos;lerini görüntülüyorsun.
                        </p>
                    </div>

                    {error && <p className="text-xs text-red-600">{error}</p>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Sol: liste */}
                        <div className="bg-white rounded-xl border p-4">
                            <h2 className="font-semibold mb-3 text-sm">NFT Listesi</h2>

                            {loading ? (
                                <p className="text-sm text-slate-500">Yükleniyor...</p>
                            ) : nfts.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    Henüz NFT bulunmuyor. Payroll mint işlemleri tamamlandığında burada görünecek.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-xs text-slate-500">
                                                <th className="text-left py-2 pr-4">Token ID</th>
                                                <th className="text-left py-2 pr-4">Durum</th>
                                                <th className="text-left py-2 pr-4">Dönem</th>
                                                <th className="text-left py-2">Tx Hash</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {nfts.map((n) => (
                                                <tr
                                                    key={n.id}
                                                    className="border-b last:border-0 hover:bg-slate-50 cursor-pointer"
                                                    onClick={() => setSelected(n)}
                                                >
                                                    <td className="py-2 pr-4 text-xs font-mono">
                                                        {n.token_id ?? "-"}
                                                    </td>
                                                    <td className="py-2 pr-4 text-xs">
                                                        <StatusBadge status={n.status} />
                                                    </td>
                                                    <td className="py-2 pr-4 text-xs">
                                                        {n.payroll
                                                            ? `${n.payroll.period_start} → ${n.payroll.period_end}`
                                                            : "-"}
                                                    </td>
                                                    <td className="py-2 text-[11px] text-slate-600">
                                                        <span className="font-mono break-all">
                                                            {n.tx_hash || "-"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Sağ: seçili NFT detayı */}
                        <div className="bg-white rounded-xl border p-4">
                            <h2 className="font-semibold mb-3 text-sm">
                                NFT Detayı
                            </h2>

                            {!selected ? (
                                <p className="text-sm text-slate-500">
                                    Detay göstermek için listeden bir NFT seç.
                                </p>
                            ) : (
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="font-semibold">Token ID: </span>
                                        <span className="font-mono">
                                            {selected.token_id ?? "-"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold">Durum: </span>
                                        <StatusBadge status={selected.status} />
                                    </div>
                                    {selected.payroll && (
                                        <>
                                            <div>
                                                <span className="font-semibold">Dönem: </span>
                                                {selected.payroll.period_start} →{" "}
                                                {selected.payroll.period_end}
                                            </div>
                                            <div>
                                                <span className="font-semibold">Brüt / Net: </span>
                                                {selected.payroll.gross_salary} ₺ /{" "}
                                                {selected.payroll.net_salary} ₺
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <span className="font-semibold">Tx Hash: </span>
                                        <span className="font-mono break-all">
                                            {selected.tx_hash || "-"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold">IPFS CID: </span>
                                        <span className="font-mono break-all">
                                            {selected.ipfs_cid || "-"}
                                        </span>
                                    </div>
                                    {selected.ipfs_url && (
                                        <div>
                                            <span className="font-semibold">IPFS URL: </span>
                                            <a
                                                href={selected.ipfs_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs text-blue-600 underline break-all"
                                            >
                                                {selected.ipfs_url}
                                            </a>
                                        </div>
                                    )}
                                    {selected.explorer_url && (
                                        <div>
                                            <span className="font-semibold">Explorer: </span>
                                            <a
                                                href={selected.explorer_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs text-blue-600 underline break-all"
                                            >
                                                {selected.explorer_url}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
