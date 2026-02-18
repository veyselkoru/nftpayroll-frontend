"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Copy, ExternalLink, Search, RotateCcw } from "lucide-react";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import Select2 from "@/app/components/Select2";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import { fetchCompanyNfts } from "@/lib/companies";
import { formatDateTimeDDMMYYYY } from "@/lib/date";

export default function CompanyNftsPage() {
    const ready = useAuthGuard();
    const { companyId } = useParams();

    const [nfts, setNfts] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [copied, setCopied] = useState("");


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

    useEffect(() => {
        if (!copied) return;
        const id = setTimeout(() => setCopied(""), 1500);
        return () => clearTimeout(id);
    }, [copied]);

    const statusCounts = useMemo(() => {
        return nfts.reduce(
            (acc, nft) => {
                const status = nft.status || "unknown";
                acc.total += 1;
                if (status in acc) {
                    acc[status] += 1;
                } else {
                    acc.unknown += 1;
                }
                return acc;
            },
            {
                total: 0,
                pending: 0,
                sending: 0,
                sent: 0,
                failed: 0,
                unknown: 0,
            }
        );
    }, [nfts]);

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

    const filteredNfts = useMemo(() => {
        const list = nfts.filter((nft) => {
            if (statusFilter !== "all" && nft.status !== statusFilter) {
                return false;
            }

            if (search.trim()) {
                const q = search.toLowerCase();
                const employee = (nft.employee || "").toLowerCase();
                const tx = (nft.tx_hash || "").toLowerCase();
                const tokenId = (nft.token_id ? String(nft.token_id) : "").toLowerCase();
                const id = String(nft.id || "");

                if (
                    !employee.includes(q) &&
                    !tx.includes(q) &&
                    !tokenId.includes(q) &&
                    !id.includes(q)
                ) {
                    return false;
                }
            }

            return true;
        });

        list.sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;

            if (sortBy === "oldest") return aTime - bTime;
            if (sortBy === "token-asc") return Number(a.token_id || 0) - Number(b.token_id || 0);
            if (sortBy === "token-desc") return Number(b.token_id || 0) - Number(a.token_id || 0);
            if (sortBy === "status") return String(a.status || "").localeCompare(String(b.status || ""), "tr");
            return bTime - aTime;
        });

        return list;
    }, [nfts, search, sortBy, statusFilter]);

    useEffect(() => {
        if (filteredNfts.length === 0) {
            setSelected(null);
            return;
        }
        if (!selected) {
            setSelected(filteredNfts[0]);
            return;
        }
        const stillExists = filteredNfts.some((item) => item.id === selected.id);
        if (!stillExists) {
            setSelected(filteredNfts[0]);
        }
    }, [filteredNfts, selected]);

    const statusFilterOptions = [
        { key: "all", label: `Hepsi (${statusCounts.total})` },
        { key: "pending", label: `Pending (${statusCounts.pending})` },
        { key: "sending", label: `Sending (${statusCounts.sending})` },
        { key: "sent", label: `Sent (${statusCounts.sent})` },
        { key: "failed", label: `Failed (${statusCounts.failed})` },
    ];

    const sortOptions = [
        { value: "newest", label: "En yeni" },
        { value: "oldest", label: "En eski" },
        { value: "token-asc", label: "Token ID (artan)" },
        { value: "token-desc", label: "Token ID (azalan)" },
        { value: "status", label: "Duruma göre" },
    ];

    const copyText = async (value, key) => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopied(key);
        } catch {
            setCopied("");
        }
    };


    return (
        <div className="min-h-screen flex ta-shell">
            <Sidebar />

            <div className="flex flex-col flex-1 min-w-0">
                <Navbar />

                <main className="ta-page space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h1 className="text-xl md:text-2xl font-semibold">
                            Firma NFT&apos;leri
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

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="ta-card p-3">
                            <div className="text-xs text-slate-500">Toplam NFT</div>
                            <div className="text-lg font-semibold mt-1">{statusCounts.total}</div>
                        </div>
                        <div className="ta-card p-3">
                            <div className="text-xs text-slate-500">Pending</div>
                            <div className="text-lg font-semibold mt-1 text-yellow-700">{statusCounts.pending}</div>
                        </div>
                        <div className="ta-card p-3">
                            <div className="text-xs text-slate-500">Sending</div>
                            <div className="text-lg font-semibold mt-1 text-blue-700">{statusCounts.sending}</div>
                        </div>
                        <div className="ta-card p-3">
                            <div className="text-xs text-slate-500">Sent</div>
                            <div className="text-lg font-semibold mt-1 text-green-700">{statusCounts.sent}</div>
                        </div>
                        <div className="ta-card p-3">
                            <div className="text-xs text-slate-500">Failed</div>
                            <div className="text-lg font-semibold mt-1 text-red-700">{statusCounts.failed}</div>
                        </div>
                    </div>

                    {/* Filter bar */}
                    <div className="ta-card p-3 space-y-3">
                        <div className="flex flex-wrap gap-2 text-xs">
                            {statusFilterOptions.map((opt) => (
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

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="md:col-span-6 relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Employee / tx / token / ID ara..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <Select2
                                    name="sortBy"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    options={sortOptions}
                                    isSearchable={false}
                                />
                            </div>
                            <div className="md:col-span-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter("all");
                                        setSearch("");
                                        setSortBy("newest");
                                    }}
                                    className="w-full h-[38px] inline-flex items-center justify-center gap-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50 transition"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Filtreleri Sıfırla
                                </button>
                            </div>
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
                            <div className="md:col-span-1 ta-card p-3 space-y-2 max-h-[72vh] overflow-auto">
                                <div className="sticky top-0 bg-white z-10 text-xs font-medium text-slate-500 pb-2">
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
                                            <div className="flex items-center justify-between mt-0.5">
                                                {nft.created_at && (
                                                    <div className="text-[11px] text-slate-400">
                                                        {formatDateTimeDDMMYYYY(nft.created_at)}
                                                    </div>
                                                )}
                                                {nft.tx_hash ? (
                                                    <div className="text-[11px] text-slate-400 font-mono">
                                                        {nft.tx_hash.slice(0, 10)}...
                                                    </div>
                                                ) : null}
                                            </div>
                                            {nft.created_at && selected?.id === nft.id ? (
                                                <div className="text-[11px] text-slate-400 mt-1">
                                                    {formatDateTimeDDMMYYYY(nft.created_at)}
                                                </div>
                                            ) : null}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sağ taraf: detay */}
                            <div className="md:col-span-2 ta-card p-4 min-h-[260px]">
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
                                            <div className="flex items-center gap-2">
                                                {statusBadge(selected.status)}
                                            </div>
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
                                                    <div className="space-y-1">
                                                        <div className="text-xs break-all font-mono">
                                                            {selected.tx_hash}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                copyText(selected.tx_hash, "tx")
                                                            }
                                                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                            {copied === "tx" ? "Kopyalandı" : "Kopyala"}
                                                        </button>
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
                                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline break-all"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
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
                                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline break-all"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
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
                                                {formatDateTimeDDMMYYYY(selected.created_at)}
                                            </div>
                                        )}

                                        <details className="pt-1">
                                            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
                                                Ham JSON verisini göster
                                            </summary>
                                            <pre className="mt-2 text-[11px] bg-slate-50 border border-slate-200 rounded p-2 overflow-x-auto">
                                                {JSON.stringify(selected, null, 2)}
                                            </pre>
                                        </details>
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
