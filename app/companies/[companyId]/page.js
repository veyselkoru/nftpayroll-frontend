"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import {
    fetchCompanyDetail,
    fetchCompanyNfts,
} from "@/lib/companies";
import { fetchEmployees } from "@/lib/employees";
import { useToast } from "@/app/components/ToastProvider";
import ImportPreviewModal from "@/app/components/ImportPreviewModal";
import { bulkCreateCompanyPayrollsApi } from "@/lib/payrolls";

export default function CompanyDetailPage() {
    const ready = useAuthGuard();
    const router = useRouter();
    const { companyId } = useParams();
    const { showToast } = useToast();

    const [company, setCompany] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [nfts, setNfts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // NFT filtre + sayfalama
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // Toplu JSON import (dropzone) state’leri
    const [dragActive, setDragActive] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkError, setBulkError] = useState("");
    const [bulkStats, setBulkStats] = useState(null);
    const [bulkProgress, setBulkProgress] = useState(null);
    const [importPreview, setImportPreview] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);

    useEffect(() => {
        if (!ready || !companyId) return;

        const load = async () => {
            setLoading(true);
            setError("");

            try {
                // 1) Şirket detayı
                const c = await fetchCompanyDetail(companyId);
                setCompany(c);

                // 2) Çalışanlar
                try {
                    const empRes = await fetchEmployees(companyId);
                    const list = Array.isArray(empRes)
                        ? empRes
                        : empRes.data || [];
                    setEmployees(list);
                } catch {
                    // çalışan yoksa sessiz geç
                }

                // 3) NFT'ler
                try {
                    await reloadNfts();
                } catch {
                    // nft yoksa sessiz geç
                }
            } catch (err) {
                setError(err.message || "Şirket detayı alınamadı");
            } finally {
                setLoading(false);
            }
        };

        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, companyId]);

    const reloadNfts = async () => {
        const nftsRes = await fetchCompanyNfts(companyId);
        const list = nftsRes.nfts || nftsRes.data || [];
        setNfts(list);
    };

    const goBack = () => {
        router.push("/companies");
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

    // NFT filtrelenmiş liste (frontend tarafı filtre)
    const filteredNfts = (nfts || []).filter((n) => {
        if (statusFilter !== "all" && n.status !== statusFilter) return false;

        if (search.trim()) {
            const q = search.toLowerCase();
            const employeeName = (n.employee || "").toLowerCase();
            const tc = (n.national_id || "").toLowerCase();
            const tx = (n.tx_hash || "").toLowerCase();
            const tokenId = (n.token_id ? String(n.token_id) : "").toLowerCase();

            if (
                !employeeName.includes(q) &&
                !tc.includes(q) &&
                !tx.includes(q) &&
                !tokenId.includes(q)
            ) {
                return false;
            }
        }

        return true;
    });

    const totalPages = Math.max(
        1,
        Math.ceil(filteredNfts.length / pageSize)
    );
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const pageItems = filteredNfts.slice(
        startIndex,
        startIndex + pageSize
    );

    // Filtreler / liste değiştiğinde sayfayı resetle
    useEffect(() => {
        setPage(1);
    }, [statusFilter, search, nfts.length]);

    // ---- JSON import helper’ları ----

    const validateAndNormalizeCompanyItem = (item, index) => {
        const errors = [];
        const obj = typeof item === "object" && item !== null ? item : {};

        const national_id = obj.national_id;
        const period_start = obj.period_start;
        const period_end = obj.period_end;
        const gross_salary = obj.gross_salary;
        const net_salary = obj.net_salary;

        if (!national_id) {
            errors.push("national_id (TC) alanı zorunlu.");
        } else if (!/^\d{11}$/.test(String(national_id))) {
            errors.push("national_id 11 haneli ve sadece rakamlardan oluşmalı.");
        }

        if (!period_start) errors.push("period_start alanı zorunlu.");
        if (!period_end) errors.push("period_end alanı zorunlu.");
        if (
            gross_salary === undefined ||
            gross_salary === null ||
            gross_salary === ""
        )
            errors.push("gross_salary alanı zorunlu.");
        if (
            net_salary === undefined ||
            net_salary === null ||
            net_salary === ""
        )
            errors.push("net_salary alanı zorunlu.");

        const toNumber = (value, field) => {
            if (value === undefined || value === null || value === "") return null;
            const n = Number(
                typeof value === "string"
                    ? value.replace(/\./g, "").replace(",", ".")
                    : value
            );
            if (Number.isNaN(n)) {
                errors.push(`${field} sayısal olmalı.`);
                return null;
            }
            return n;
        };

        const normalized = {
            national_id: national_id ? String(national_id) : null,
            period_start,
            period_end,
            payment_date: obj.payment_date ?? null,
            currency: obj.currency || "TRY",

            gross_salary: toNumber(gross_salary, "gross_salary"),
            net_salary: toNumber(net_salary, "net_salary"),
            bonus: toNumber(obj.bonus, "bonus"),
            deductions_total: toNumber(
                obj.deductions_total,
                "deductions_total"
            ),

            employer_sign_name: obj.employer_sign_name ?? null,
            employer_sign_title: obj.employer_sign_title ?? null,

            batch_id: obj.batch_id ?? null,
            external_batch_ref: obj.external_batch_ref ?? null,
            external_ref: obj.external_ref ?? null,

            original_index: index,
        };

        if (normalized.gross_salary === null)
            errors.push("gross_salary sayısal olmalı.");
        if (normalized.net_salary === null)
            errors.push("net_salary sayısal olmalı.");

        if (errors.length > 0) {
            const summary = `#${index + 1} - TC: ${national_id || "?"
                }, dönem: ${period_start || "?"} - ${period_end || "?"
                }, net: ${normalized.net_salary ?? "?"}`;
            return {
                ok: false,
                index,
                errors,
                summary,
            };
        }

        const summary = `#${index + 1} - TC: ${national_id || "?"
            }, dönem: ${period_start} - ${period_end}, net: ${normalized.net_salary
            }`;

        return {
            ok: true,
            index,
            normalized,
            summary,
        };
    };

    const importPayrollsFromJsonFileCompany = async (file) => {
        setBulkError("");
        setBulkProgress(null);
        setBulkStats(null);
        setImportPreview(null);

        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".json")) {
            const msg = "Lütfen .json uzantılı bir dosya yükleyin.";
            setBulkError(msg);
            showToast(msg, "error");
            return;
        }

        let text;
        try {
            text = await file.text();
        } catch (err) {
            const msg = "Dosya okunamadı: " + (err.message || String(err));
            setBulkError(msg);
            showToast(msg, "error");
            return;
        }

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (err) {
            const msg = "Geçersiz JSON: " + (err.message || String(err));
            setBulkError(msg);
            showToast(msg, "error");
            return;
        }

        const rawItems = Array.isArray(parsed) ? parsed : [parsed];
        if (!rawItems.length) {
            const msg = "JSON içinde kayıt bulunamadı.";
            setBulkError(msg);
            showToast(msg, "error");
            return;
        }

        const validPayloads = [];
        const invalidItems = [];

        rawItems.forEach((item, index) => {
            const result = validateAndNormalizeCompanyItem(item, index);
            if (result.ok) {
                validPayloads.push(result.normalized);
            } else {
                invalidItems.push({
                    index: result.index,
                    errors: result.errors,
                    summary: result.summary,
                });
            }
        });

        const preview = {
            fileName: file.name,
            total: rawItems.length,
            validCount: validPayloads.length,
            invalidCount: invalidItems.length,
            invalidItems,
            validPayloads,
        };

        setImportPreview(preview);
        setShowImportModal(true);

        showToast(
            `${preview.total} kayıt analiz edildi: ${preview.validCount} geçerli, ${preview.invalidCount} hatalı.`,
            preview.invalidCount > 0 ? "warning" : "success"
        );
    };

    const handleDropzoneFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await importPayrollsFromJsonFileCompany(file);
        e.target.value = "";
    };

    const handleDropzoneDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer?.files?.[0];
        if (!file) return;

        await importPayrollsFromJsonFileCompany(file);
    };

    const handleDropzoneDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dragActive) setDragActive(true);
    };

    const handleDropzoneDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleDownloadSampleCompanyJson = () => {
        const sample = [
            {
                national_id: "11111111111",
                period_start: "2025-01-01",
                period_end: "2025-01-31",
                payment_date: "2025-02-10",
                currency: "TRY",
                gross_salary: 85000,
                net_salary: 65000,
                bonus: 5000,
                deductions_total: 2000,
                employer_sign_name: "Şirket Yetkilisi",
                employer_sign_title: "İK Müdürü",
                batch_id: "2025-01",
                external_batch_ref: "HR-SYSTEM-2025-01",
                external_ref: "PAYROLL-0001",
            },
        ];

        const blob = new Blob([JSON.stringify(sample, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "nftpayroll-company-payroll-sample.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const handleConfirmCompanyImport = async () => {
        if (!importPreview || !importPreview.validPayloads.length) return;

        const items = importPreview.validPayloads;

        setBulkLoading(true);
        setBulkError("");
        setBulkStats(null);
        setBulkProgress({
            total: items.length,
            processed: 0,
        });

        const chunkSize = 200;
        let success = 0;
        let failed = 0;
        let payrollGroupId = null;

        try {
            for (let i = 0; i < items.length; i += chunkSize) {
                const chunk = items.slice(i, i + chunkSize);

                const res = await bulkCreateCompanyPayrollsApi(
                    companyId,
                    chunk,
                    payrollGroupId
                );

                const createdItems = res.created || [];
                const failedItems = res.failed || [];

                success += createdItems.length;
                failed += failedItems.length;

                if (!payrollGroupId && res.payroll_group_id) {
                    payrollGroupId = res.payroll_group_id;
                }

                setBulkProgress((prev) =>
                    prev
                        ? {
                            ...prev,
                            processed: Math.min(
                                prev.total,
                                prev.processed + chunk.length
                            ),
                        }
                        : {
                            total: items.length,
                            processed: chunk.length,
                        }
                );
            }

            setBulkStats({
                total: items.length,
                imported: success,
                failed,
                payrollGroupId,
            });

            showToast(
                `Toplam ${items.length} kaydın ${success} tanesi eklendi, ${failed} tanesi hatalı.`,
                failed ? "warning" : "success"
            );

            setShowImportModal(false);

            // Yeni oluşturulan bordroların NFT'leri için listeyi yenile
            await reloadNfts();
        } catch (err) {
            const msg =
                err?.message ||
                "Toplu bordro içe aktarma sırasında bir hata oluştu.";
            setBulkError(msg);
            showToast(msg, "error");
        } finally {
            setBulkLoading(false);
        }
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
                                ← Şirket listesine dön
                            </button>
                            <h1 className="text-2xl font-bold">
                                {company?.name || `Şirket #${companyId}`}
                            </h1>
                            <p className="text-xs text-slate-500">
                                ID: {companyId}
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
                    ) : !company ? (
                        <div className="text-sm text-slate-500">
                            Şirket bulunamadı.
                        </div>
                    ) : (
                        <div className="row">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {/* SOL: Şirket bilgileri */}
                                <div className="bg-white rounded-xl border p-4 space-y-3">
                                    <div>
                                        <div className="text-xs text-slate-500">
                                            Şirket
                                        </div>
                                        <div className="text-lg font-semibold">
                                            {company.name}
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        {company.tax_number && (
                                            <div>
                                                <div className="text-xs text-slate-500">
                                                    Vergi No
                                                </div>
                                                <div>{company.tax_number}</div>
                                            </div>
                                        )}

                                        {(company.country || company.city) && (
                                            <div>
                                                <div className="text-xs text-slate-500">
                                                    Lokasyon
                                                </div>
                                                <div>
                                                    {company.city}{" "}
                                                    {company.country &&
                                                        ` / ${company.country}`}
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                            <div>
                                                <div className="text-xs text-slate-500">
                                                    Çalışan sayısı
                                                </div>
                                                <div>{employees.length}</div>
                                            </div>

                                            <div>
                                                <div className="text-xs text-slate-500">
                                                    Toplam NFT
                                                </div>
                                                <div>{nfts.length}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                                        <button
                                            onClick={() =>
                                                router.push(
                                                    `/companies/${companyId}/employees`
                                                )
                                            }
                                            className="px-3 py-1 rounded bg-slate-900 text-white hover:bg-slate-800 w-full text-center"
                                        >
                                            Çalışan listesi →
                                        </button>

                                        <button
                                            onClick={() =>
                                                router.push(
                                                    `/companies/${companyId}/nfts`
                                                )
                                            }
                                            className="px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 w-full text-center"
                                        >
                                            NFT detay sayfası →
                                        </button>
                                    </div>
                                </div>

                                {/* ORTA: Son çalışanlar */}
                                <div className="bg-white rounded-xl border p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-xs text-slate-500">
                                                Çalışanlar
                                            </div>
                                            <div className="text-sm font-semibold">
                                                Son eklenen çalışanlar
                                            </div>
                                        </div>
                                    </div>

                                    {employees.length === 0 ? (
                                        <div className="text-xs text-slate-500">
                                            Bu şirkete kayıtlı çalışan yok.
                                        </div>
                                    ) : (
                                        <div className="space-y-2 text-xs max-h-[260px] overflow-auto">
                                            {employees
                                                .slice()
                                                .sort((a, b) => b.id - a.id)
                                                .slice(0, 5)
                                                .map((e) => (
                                                    <button
                                                        key={e.id}
                                                        type="button"
                                                        onClick={() =>
                                                            router.push(
                                                                `/companies/${companyId}/employees/${e.id}/payrolls`
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-left"
                                                    >
                                                        <div className="font-medium">
                                                            {e.name ||
                                                                `Employee #${e.id}`}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">
                                                            {e.national_id
                                                                ? `TC: ${e.national_id}`
                                                                : "TC bilgisi yok"}
                                                        </div>
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>

                                {/* SAĞ: NFT'ler – Dropzone + Tablo */}
                                <div className="bg-white rounded-xl border p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-xs text-slate-500">
                                                NFT&apos;ler
                                            </div>
                                            <div className="text-sm font-semibold">
                                                Toplu JSON import & liste
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dropzone */}
                                    <div
                                        onDragOver={handleDropzoneDragOver}
                                        onDragLeave={handleDropzoneDragLeave}
                                        onDrop={handleDropzoneDrop}
                                        className={
                                            "border-2 border-dashed rounded-lg p-3 text-[11px] md:text-xs " +
                                            "flex flex-col items-center justify-center gap-2 " +
                                            (dragActive
                                                ? "border-slate-600 bg-slate-100"
                                                : "border-slate-300 bg-slate-50")
                                        }
                                    >
                                        <p className="font-medium text-slate-700 text-center">
                                            JSON ile toplu payroll yükle
                                        </p>
                                        <p className="text-[11px] text-slate-500 text-center">
                                            Tüm çalışanlar için bordroları içeren
                                            .json dosyanızı buraya
                                            sürükleyip bırakın veya dosya seçin.
                                        </p>
                                        <p className="text-[11px] text-slate-400 text-center">
                                            Format: [&#123; national_id,
                                            period_start, period_end, ... &#125;]
                                        </p>

                                        <div className="mt-2 flex flex-wrap gap-2 justify-center">
                                            <label className="inline-flex items-center px-3 py-1.5 rounded border border-slate-300 text-[11px] font-medium cursor-pointer hover:bg-slate-100">
                                                Dosya Seç
                                                <input
                                                    type="file"
                                                    accept="application/json,.json"
                                                    className="hidden"
                                                    onChange={
                                                        handleDropzoneFileChange
                                                    }
                                                    disabled={bulkLoading}
                                                />
                                            </label>

                                            <button
                                                type="button"
                                                onClick={
                                                    handleDownloadSampleCompanyJson
                                                }
                                                className="inline-flex items-center px-3 py-1.5 rounded border border-slate-300 text-[11px] font-medium hover:bg-slate-100 disabled:opacity-60"
                                                disabled={bulkLoading}
                                            >
                                                Örnek JSON indir
                                            </button>
                                        </div>

                                        {bulkProgress && (
                                            <div className="w-full mt-2">
                                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-500 transition-all"
                                                        style={{
                                                            width: `${(bulkProgress.processed /
                                                                bulkProgress.total) *
                                                                100
                                                                }%`,
                                                        }}
                                                    />
                                                </div>
                                                <p className="mt-1 text-[11px] text-slate-500">
                                                    {bulkProgress.processed} /{" "}
                                                    {bulkProgress.total} kayıt
                                                    işlendi
                                                </p>
                                            </div>
                                        )}

                                        {bulkError && (
                                            <p className="mt-2 text-[11px] text-red-600">
                                                {bulkError}
                                            </p>
                                        )}

                                        {bulkStats && !bulkLoading && (
                                            <p className="mt-2 text-[11px] text-emerald-600 text-center">
                                                Toplam {bulkStats.total} kaydın{" "}
                                                {bulkStats.imported} tanesi eklendi,{" "}
                                                {bulkStats.failed} tanesi hatalı.{" "}
                                                {bulkStats.payrollGroupId && (
                                                    <span className="block">
                                                        Group ID:{" "}
                                                        {
                                                            bulkStats.payrollGroupId
                                                        }
                                                    </span>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border p-4 space-y-3 my-4">
                                <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
                                    {/* NFT Tablosu */}
                                    <div className="space-y-2">
                                        {/* Filtreler */}
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex flex-wrap gap-1 text-[11px]">
                                                {[
                                                    { key: "all", label: "Hepsi" },
                                                    {
                                                        key: "pending",
                                                        label: "Pending",
                                                    },
                                                    {
                                                        key: "sending",
                                                        label: "Sending",
                                                    },
                                                    { key: "sent", label: "Sent" },
                                                    {
                                                        key: "failed",
                                                        label: "Failed",
                                                    },
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.key}
                                                        onClick={() =>
                                                            setStatusFilter(
                                                                opt.key
                                                            )
                                                        }
                                                        className={[
                                                            "px-2 py-1 rounded-full border transition",
                                                            statusFilter ===
                                                                opt.key
                                                                ? "bg-slate-900 text-white border-slate-900"
                                                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                                                        ].join(" ")}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="w-full md:w-44">
                                                <input
                                                    type="text"
                                                    placeholder="Çalışan / TC / tx / token..."
                                                    value={search}
                                                    onChange={(e) =>
                                                        setSearch(e.target.value)
                                                    }
                                                    className="w-full px-2 py-1.5 rounded border border-slate-200 text-[11px] focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                                                />
                                            </div>
                                        </div>

                                        {/* Tablo */}
                                        {loading ? (
                                            <div className="text-xs text-slate-500 mt-2">
                                                Yükleniyor...
                                            </div>
                                        ) : filteredNfts.length === 0 ? (
                                            <div className="text-xs text-slate-500 mt-2">
                                                Bu filtrelere uyan NFT bulunamadı.
                                            </div>
                                        ) : (
                                            <>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-[11px] border-collapse">
                                                        <thead>
                                                            <tr className="border-b bg-slate-50 text-[11px] text-slate-600">
                                                                <th className="py-1.5 px-2 text-left">
                                                                    NFT
                                                                </th>
                                                                <th className="py-1.5 px-2 text-left">
                                                                    Çalışan
                                                                </th>
                                                                <th className="py-1.5 px-2 text-center">
                                                                    Durum
                                                                </th>
                                                                <th className="py-1.5 px-2 text-center">
                                                                    Token
                                                                </th>
                                                                <th className="py-1.5 px-2 text-center">
                                                                    Tx Hash
                                                                </th>
                                                                <th className="py-1.5 px-2 text-center">
                                                                    Tarih
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {pageItems.map((n) => (
                                                                <tr
                                                                    key={n.id}
                                                                    className="border-b last:border-0 hover:bg-slate-50"
                                                                >
                                                                    <td className="py-1.5 px-2">
                                                                        {n.image_url ||
                                                                            n.ipfs_url ? (
                                                                            <img
                                                                                src={
                                                                                    n.image_url ||
                                                                                    n.ipfs_url
                                                                                }
                                                                                alt={`NFT #${n.id}`}
                                                                                className="w-8 h-8 rounded border object-cover"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-8 h-8 rounded border bg-slate-100 flex items-center justify-center text-[9px] text-slate-400">
                                                                                NFT
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-1.5 px-2">
                                                                        <div className="font-medium">
                                                                            {n.employee ||
                                                                                "—"}
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-500">
                                                                            {n.national_id ||
                                                                                ""}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-1.5 px-2 text-center">
                                                                        {statusBadge(
                                                                            n.status
                                                                        )}
                                                                    </td>
                                                                    <td className="py-1.5 px-2 text-center">
                                                                        {n.token_id ??
                                                                            "—"}
                                                                    </td>
                                                                    <td className="py-1.5 px-2 text-center">
                                                                        {n.tx_hash ? (
                                                                            <a
                                                                                href={
                                                                                    n.explorer_url ||
                                                                                    "#"
                                                                                }
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="text-[10px] text-blue-600 hover:underline break-all"
                                                                            >
                                                                                {
                                                                                    n.tx_hash
                                                                                }
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-[10px] text-slate-400">
                                                                                —
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-1.5 px-2 text-center text-[10px] text-slate-500">
                                                                        {n.created_at_formatted ||
                                                                            (n.created_at &&
                                                                                new Date(
                                                                                    n.created_at
                                                                                ).toLocaleString())}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Pager */}
                                                <div className="flex items-center justify-between mt-2 text-[11px]">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setPage((p) =>
                                                                Math.max(1, p - 1)
                                                            )
                                                        }
                                                        disabled={
                                                            currentPage === 1
                                                        }
                                                        className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40"
                                                    >
                                                        Önceki
                                                    </button>
                                                    <div className="text-slate-600">
                                                        Sayfa {currentPage} /{" "}
                                                        {totalPages} — Toplam{" "}
                                                        {filteredNfts.length} NFT
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setPage((p) =>
                                                                Math.min(
                                                                    totalPages,
                                                                    p + 1
                                                                )
                                                            )
                                                        }
                                                        disabled={
                                                            currentPage ===
                                                            totalPages
                                                        }
                                                        className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40"
                                                    >
                                                        Sonraki
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <ImportPreviewModal
                        open={showImportModal}
                        onClose={() => {
                            if (!bulkLoading) setShowImportModal(false);
                        }}
                        preview={importPreview}
                        onConfirm={handleConfirmCompanyImport}
                        loading={bulkLoading}
                    />
                </main>
            </div>
        </div>
    );
}
