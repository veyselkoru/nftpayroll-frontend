"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import { fetchCompanyNfts } from "@/lib/companies";

export default function CompanyNftsPage() {
    const ready = useAuthGuard();
    const { companyId } = useParams();

    const [nfts, setNfts] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");


    useEffect(() => {
        if (!ready || !companyId) return;

        const load = async () => {
            setLoading(true);
            setError("");

            try {
                const res = await fetchCompanyNfts(companyId);
                const list = res.nfts || res.data || [];
                setNfts(list);
                if (list.length > 0) {
                    setSelected(list[0]);
                }
            } catch (err) {
                setError(err.message || "NFT listesi alınamadı");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [ready, companyId]);

    const statusBadge = (status) => {
        const colors = {
            pending: "bg-yellow-100 text-yellow-700",
            sending: "bg-blue-100 text-blue-700",
            sent: "bg-green-100 text-green-700",
            failed: "bg-red-100 text-red-700",
        };

        return (
            <span
                className={`inline-flex items-center px-2 py-1 text-xs rounded ${colors[status] || "bg-gray-100 text-gray-700"
                    }`}
            >
                {status || "unknown"}
            </span>
        );
    };

    const filteredNfts = nfts.filter((nft) => {
        // Status filtresi
        if (statusFilter !== "all" && nft.status !== statusFilter) {
            return false;
        }

        // Arama filtresi (employee adı + tx hash + token_id)
        if (search.trim()) {
            const q = search.toLowerCase();
            const employee = (nft.employee || "").toLowerCase();
            const tx = (nft.tx_hash || "").toLowerCase();
            const tokenId = (nft.token_id ? String(nft.token_id) : "").toLowerCase();

            if (
                !employee.includes(q) &&
                !tx.includes(q) &&
                !tokenId.includes(q)
            ) {
                return false;
            }
        }

        return true;
    });


    return (
        <div className="min-h-screen flex bg-slate-100">
            <Sidebar />

            <div className="flex flex-col flex-1 min-w-0">
                <Navbar />

                <main className="flex-1 p-4 md:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-semibold">
                            Şirket NFT&apos;leri
                        </h1>
                        <div className="text-xs text-slate-500">
                            Company ID: {companyId}
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
                            {error}
                        </div>
                    )}

                    {/* Filter bar */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
                        <div className="flex flex-wrap gap-2 text-xs">
                            {[
                                { key: "all", label: "Hepsi" },
                                { key: "pending", label: "Pending" },
                                { key: "sending", label: "Sending" },
                                { key: "sent", label: "Sent" },
                                { key: "failed", label: "Failed" },
                            ].map((opt) => (
                                <button
                                    key={opt.key}
                                    onClick={() => setStatusFilter(opt.key)}
                                    className={[
                                        "px-3 py-1 rounded-full border transition",
                                        statusFilter === opt.key
                                            ? "bg-slate-900 text-white border-slate-900"
                                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                                    ].join(" ")}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <div className="w-full md:w-64">
                            <input
                                type="text"
                                placeholder="Employee / tx / token ara..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full px-3 py-2 text-xs border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/30"
                            />
                        </div>
                    </div>


                    {loading ? (
                        <div className="text-sm text-slate-500">Yükleniyor...</div>
                    ) : filteredNfts.length === 0 ? (
                        <div className="text-sm text-slate-500">
                            Filtrelere uyan NFT bulunamadı.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Sol taraf: liste */}
                            <div className="md:col-span-1 bg-white rounded-xl border p-3 space-y-2 max-h-[70vh] overflow-auto">
                                <div className="text-xs font-medium text-slate-500 mb-1">
                                    NFT Listesi ({filteredNfts.length})
                                </div>

                                <div className="space-y-2">
                                    {filteredNfts.map((nft) => (
                                        <button
                                            key={nft.id}
                                            onClick={() => setSelected(nft)}
                                            className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${selected?.id === nft.id
                                                ? "bg-slate-900 text-white border-slate-900"
                                                : "bg-white hover:bg-slate-50 border-slate-200"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">
                                                    #{nft.id}{" "}
                                                    {nft.token_id
                                                        ? `• Token ${nft.token_id}`
                                                        : ""}
                                                </span>
                                                {statusBadge(nft.status)}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {nft.employee
                                                    ? nft.employee
                                                    : "Çalışan bilgisi yok"}
                                            </div>
                                            {nft.created_at && (
                                                <div className="text-[11px] text-slate-400 mt-0.5">
                                                    {new Date(
                                                        nft.created_at
                                                    ).toLocaleString()}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sağ taraf: detay */}
                            <div className="md:col-span-2 bg-white rounded-xl border p-4 min-h-[260px]">
                                {selected ? (
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-slate-500">
                                                    Seçili NFT
                                                </div>
                                                <div className="text-lg font-semibold">
                                                    #{selected.id}{" "}
                                                    {selected.token_id &&
                                                        `(Token ${selected.token_id})`}
                                                </div>
                                            </div>
                                            <div>{statusBadge(selected.status)}</div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                            <div className="space-y-1">
                                                <div className="text-xs text-slate-500">
                                                    Çalışan
                                                </div>
                                                <div className="font-medium">
                                                    {selected.employee ||
                                                        "Bilinmiyor"}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <div className="text-xs text-slate-500">
                                                    Tx Hash
                                                </div>
                                                {selected.tx_hash ? (
                                                    <div className="text-xs break-all">
                                                        {selected.tx_hash}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-slate-400">
                                                        Henüz tx kaydı yok
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <div className="text-xs text-slate-500">
                                                    IPFS
                                                </div>
                                                {selected.ipfs_url ? (
                                                    <a
                                                        href={selected.ipfs_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-blue-600 hover:underline break-all"
                                                    >
                                                        {selected.ipfs_url}
                                                    </a>
                                                ) : (
                                                    <div className="text-xs text-slate-400">
                                                        IPFS CID bulunamadı
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <div className="text-xs text-slate-500">
                                                    Explorer
                                                </div>
                                                {selected.explorer_url ? (
                                                    <a
                                                        href={
                                                            selected.explorer_url
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-blue-600 hover:underline break-all"
                                                    >
                                                        Etherscan&apos;de görüntüle
                                                    </a>
                                                ) : (
                                                    <div className="text-xs text-slate-400">
                                                        Explorer linki yok
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {selected.created_at && (
                                            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
                                                Oluşturulma:{" "}
                                                {new Date(
                                                    selected.created_at
                                                ).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-500">
                                        Soldan bir NFT seç.
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
