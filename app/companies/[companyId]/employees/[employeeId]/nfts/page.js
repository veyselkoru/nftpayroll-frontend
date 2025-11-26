"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { listEmployeeNfts } from "@/lib/employees";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";

export default function EmployeeNftsPage() {
    const ready = useAuthGuard();
    const { companyId, employeeId } = useParams();

    const [nfts, setNfts] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [metaLoading, setMetaLoading] = useState(false);
    const [metaError, setMetaError] = useState("");
    const [metadata, setMetadata] = useState(null);

    useEffect(() => {
        if (!ready) return;

        setLoading(true);
        setError("");
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
    }, [ready, companyId, employeeId]);

    const handleSelect = (nft) => {
        setSelected(nft);
        setMetadata(null);
        setMetaError("");
    };

    const fetchMetadata = async () => {
        if (!selected?.ipfs_cid) return;
        setMetaLoading(true);
        setMetaError("");
        setMetadata(null);

        try {
            const res = await fetch(`https://ipfs.io/ipfs/${selected.ipfs_cid}`);
            if (!res.ok) {
                throw new Error(`IPFS error (${res.status})`);
            }
            const json = await res.json();
            setMetadata(json);
        } catch (err) {
            setMetaError(err.message || "Metadata alınamadı");
        } finally {
            setMetaLoading(false);
        }
    };

    const statusBadge = (status) => {
        const colors = {
            pending: "bg-yellow-100 text-yellow-700",
            sending: "bg-blue-100 text-blue-700",
            sent: "bg-green-100 text-green-700",
            failed: "bg-red-100 text-red-700",
        };

        return (
            <span
                className={`inline-flex items-center px-2 py-1 text-xs rounded ${colors[status] || "bg-gray-100 text-gray-700"}`}
            >
                {status || "unknown"}
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

    return (
        <div className="min-h-screen flex bg-slate-100">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <Navbar />

                <main className="p-6 space-y-6 max-w-6xl mx-auto w-full">
                    <h1 className="text-xl font-semibold">Çalışan NFT&apos;leri</h1>

                    {error && (
                        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-sm text-slate-500">Yükleniyor...</div>
                    ) : nfts.length === 0 ? (
                        <div className="text-sm text-slate-500">
                            Bu çalışana ait NFT bulunamadı.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Sol liste */}
                            <div className="md:col-span-1 bg-white border rounded-xl p-3 space-y-2 max-h-[480px] overflow-auto">
                                {nfts.map((n) => (
                                    <button
                                        key={n.id}
                                        onClick={() => handleSelect(n)}
                                        className={`w-full text-left border rounded-lg p-3 text-sm mb-1 ${selected?.id === n.id
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-slate-200 hover:bg-slate-50"
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">NFT #{n.id}</span>
                                            {statusBadge(n.status)}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500 break-all">
                                            {n.tx_hash
                                                ? `${n.tx_hash.slice(0, 10)}...${n.tx_hash.slice(-6)}`
                                                : "Tx yok"}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Sağ detay paneli */}
                            <div className="md:col-span-2 bg-white border rounded-xl p-4 space-y-4">
                                {selected ? (
                                    <>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="text-sm text-slate-500">
                                                    Seçili NFT
                                                </div>
                                                <div className="text-lg font-semibold">
                                                    NFT #{selected.id}
                                                </div>
                                            </div>
                                            <div>{statusBadge(selected.status)}</div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <div className="text-xs text-slate-500">
                                                    Token ID
                                                </div>
                                                <div className="font-mono">
                                                    {selected.token_id ?? "-"}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500">Tx Hash</div>
                                                {selected.tx_hash ? (
                                                    <a
                                                        href={`https://sepolia.etherscan.io/tx/${selected.tx_hash}`}
                                                        target="_blank"
                                                        className="text-blue-600 underline break-all"
                                                    >
                                                        {selected.tx_hash}
                                                    </a>
                                                ) : (
                                                    <div className="text-slate-500">-</div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500">IPFS CID</div>
                                                {selected.ipfs_cid ? (
                                                    <a
                                                        href={`https://ipfs.io/ipfs/${selected.ipfs_cid}`}
                                                        target="_blank"
                                                        className="text-blue-600 underline break-all"
                                                    >
                                                        {selected.ipfs_cid}
                                                    </a>
                                                ) : (
                                                    <div className="text-slate-500">-</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-2">
                                            <div className="text-sm font-semibold">
                                                Metadata (IPFS)
                                            </div>
                                            <button
                                                disabled={!selected.ipfs_cid || metaLoading}
                                                onClick={fetchMetadata}
                                                className="text-xs px-3 py-1 rounded border bg-slate-50 hover:bg-slate-100 disabled:opacity-50"
                                            >
                                                {metaLoading ? "Yükleniyor..." : "Metadata’yı getir"}
                                            </button>
                                        </div>

                                        <div className="border rounded-lg bg-slate-50 p-3 max-h-64 overflow-auto text-xs font-mono whitespace-pre-wrap">
                                            {metaError && (
                                                <div className="text-red-600">{metaError}</div>
                                            )}
                                            {!metaError && metadata && (
                                                <pre>{JSON.stringify(metadata, null, 2)}</pre>
                                            )}
                                            {!metaError && !metadata && !metaLoading && (
                                                <span className="text-slate-500">
                                                    Henüz metadata yüklenmedi.
                                                </span>
                                            )}
                                        </div>
                                    </>
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
