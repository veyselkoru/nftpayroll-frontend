"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import { bulkCreatePayrollsApi } from "@/lib/payrolls";
import { useToast } from "@/app/components/ToastProvider";
import ImportPreviewModal from "@/app/components/ImportPreviewModal";

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
    const { showToast } = useToast();
    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkError, setBulkError] = useState("");
    const [bulkStats, setBulkStats] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(null);
    const [bulkFailedItems, setBulkFailedItems] = useState([]);
    const [showFailedDetails, setShowFailedDetails] = useState(false);
    const [importPreview, setImportPreview] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [groupFilter, setGroupFilter] = useState("all");
    const [page, setPage] = useState(1);
    const pageSize = 20;



    // ---- Currency helpers (TR format) ----
    const normalizeCurrencyInput = (value) => {
        if (!value) return "";
        // Sadece rakam ve virgülü bırak
        value = value.replace(/[^\d,]/g, "");
        // Birden fazla virgül varsa ilkini koru
        const parts = value.split(",");
        if (parts.length > 2) {
            value = parts[0] + "," + parts.slice(1).join("");
        }
        return value;
    };

    const formatCurrencyTR = (value) => {
        if (!value) return "";
        let [intPart, decPart = ""] = value.split(",");
        intPart = intPart.replace(/\D/g, "");
        if (!intPart) return "";

        // Binlik ayırıcı ekle
        intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        // En fazla 2 hane
        if (decPart.length > 2) decPart = decPart.slice(0, 2);

        return decPart ? `${intPart},${decPart}` : intPart;
    };

    const parseCurrencyToFloat = (value) => {
        if (!value) return 0;
        // 10.000,25 -> 10000.25
        const normalized = value.replace(/\./g, "").replace(",", ".");
        const num = parseFloat(normalized);
        return isNaN(num) ? 0 : num;
    };



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


    // Group ID seçenekleri (dropdownda göstereceğiz)
    const groupOptions = Array.from(
        new Set(
            (payrolls || [])
                .map((p) => p.payroll_group_id)
                .filter(Boolean)
        )
    );

    // Filtrelenmiş liste
    const filteredPayrolls = (payrolls || []).filter((p) => {
        if (!groupFilter || groupFilter === "all") return true;
        if (groupFilter === "none") return !p.payroll_group_id;
        return p.payroll_group_id === groupFilter;
    });

    // Sayfalama hesapları
    const totalPages = Math.max(
        1,
        Math.ceil(filteredPayrolls.length / pageSize)
    );
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const pageItems = filteredPayrolls.slice(
        startIndex,
        startIndex + pageSize
    );

    // Filtre değiştiğinde / liste boyu değiştiğinde sayfayı 1'e çek
    useEffect(() => {
        setPage(1);
    }, [groupFilter, payrolls.length]);



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

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Ücret / sayısal alanlar (sadece rakam + virgül)
        const currencyFields = [
            "gross_salary",
            "net_salary",
            "bonus",
            "deductions_total",
        ];

        if (currencyFields.includes(name)) {
            const normalized = normalizeCurrencyInput(value);
            setForm((prev) => ({ ...prev, [name]: normalized }));
            return;
        }

        setForm((prev) => ({ ...prev, [name]: value }));
    };


    const normalizeImportedPayroll = (item, formDefaults) => {
        if (!item || typeof item !== "object") return null;

        const required = ["period_start", "period_end", "gross_salary", "net_salary"];
        for (const key of required) {
            if (!item[key]) {
                console.warn("Eksik zorunlu alan:", key, item);
                return null;
            }
        }

        const toNumber = (value) => {
            if (value === null || value === undefined || value === "") return null;
            const n = Number(value);
            return Number.isNaN(n) ? null : n;
        };

        const payload = {
            period_start: item.period_start,
            period_end: item.period_end,
            payment_date: item.payment_date ?? null,
            currency: item.currency || formDefaults.currency || "TRY",

            gross_salary: toNumber(item.gross_salary),
            net_salary: toNumber(item.net_salary),
            bonus: toNumber(item.bonus),
            deductions_total: toNumber(item.deductions_total),

            employer_sign_name:
                (item.employer_sign_name ?? formDefaults.employer_sign_name) || null,
            employer_sign_title:
                (item.employer_sign_title ?? formDefaults.employer_sign_title) || null,

            batch_id: item.batch_id ?? null,
            external_batch_ref: item.external_batch_ref ?? null,
            external_ref: item.external_ref ?? null,
        };

        if (payload.gross_salary === null || payload.net_salary === null) {
            return null;
        }

        return payload;
    };



    const importPayrollsFromJsonFile = async (file) => {
        setBulkError("");
        setBulkProgress(null);
        setImportPreview(null);
        setShowImportModal(false);

        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".json")) {
            setBulkError("Lütfen .json uzantılı bir dosya yükleyin.");
            showToast("Lütfen .json uzantılı bir dosya seçin.", "error");
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
            const msg = "JSON parse edilemedi: " + (err.message || String(err));
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
            const result = validateAndNormalizeItem(item, form, index);
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

        // küçük bir bilgilendirme
        showToast(
            `${preview.total} kayıt analiz edildi: ${preview.validCount} geçerli, ${preview.invalidCount} hatalı.`,
            preview.invalidCount > 0 ? "warning" : "success"
        );
    };




    const handleDropzoneFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await importPayrollsFromJsonFile(file);
        // aynı input’la tekrar seçebilmek için
        e.target.value = "";
    };

    const handleDropzoneDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer?.files?.[0];
        if (!file) return;

        await importPayrollsFromJsonFile(file);
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



    const validateAndNormalizeItem = (item, formDefaults, index) => {
        const errors = [];
        const obj = typeof item === "object" && item !== null ? item : {};

        const national_id = obj.national_id;
        const period_start = obj.period_start;
        const period_end = obj.period_end;
        const gross_salary = obj.gross_salary;
        const net_salary = obj.net_salary;

        // ---- TC kontrolleri ----
        if (!national_id) {
            errors.push("national_id (TC) alanı zorunlu.");
        } else if (!/^\d{11}$/.test(String(national_id))) {
            errors.push("national_id 11 haneli ve sadece rakamlardan oluşmalı.");
        }

        // ---- Zorunlu alan kontrolleri ----
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
            currency: obj.currency || formDefaults.currency || "TRY",

            gross_salary: toNumber(gross_salary, "gross_salary"),
            net_salary: toNumber(net_salary, "net_salary"),
            bonus: toNumber(obj.bonus, "bonus"),
            deductions_total: toNumber(obj.deductions_total, "deductions_total"),

            employer_sign_name:
                obj.employer_sign_name ??
                formDefaults.employer_sign_name ??
                null,
            employer_sign_title:
                obj.employer_sign_title ??
                formDefaults.employer_sign_title ??
                null,

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
            }, dönem: ${period_start} - ${period_end}, net: ${normalized.net_salary}`;

        return {
            ok: true,
            index,
            normalized,
            summary,
        };
    };



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
                gross_salary: parseCurrencyToFloat(form.gross_salary),
                net_salary: parseCurrencyToFloat(form.net_salary),
                bonus: form.bonus ? parseCurrencyToFloat(form.bonus) : null,
                deductions_total: form.deductions_total
                    ? parseCurrencyToFloat(form.deductions_total)
                    : null,
                employer_sign_name: form.employer_sign_name || null,
                employer_sign_title: form.employer_sign_title || null,
            };

            // 🔴 BURADA createPayroll DEĞİL, createPayrollApi KULLANACAĞIZ
            const created = await createPayrollApi(companyId, employeeId, payload);
            const item = created?.data || created;

            setPayrolls((prev) => [item, ...prev]);

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
            showToast(err.message || "Bir hata oluştu.", "error");
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
            showToast("Güncel durum: " + JSON.stringify(res, null, 2), "success");
            refreshPayrolls();
        } catch (err) {
            showToast(err.message || "Bir hata oluştu.", "error");
        }
    };

    // ---- Retry Mint ----
    const handleRetry = async (payrollId) => {
        try {
            await retryMintApi(companyId, employeeId, payrollId);
            setAutoRefresh(true);      // 🔹 tekrar takip et
            refreshPayrolls();
        } catch (err) {
            showToast(err.message || "Bir hata oluştu.", "error");
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


    const handleDownloadSampleJson = () => {
        const sample = [
            {
                national_id: "11111111111",
                period_start: "2025-01-01",
                period_end: "2025-01-31",
                payment_date: "2025-02-10",
                currency: form.currency || "TRY",
                gross_salary: 10000,
                net_salary: 8500,
                bonus: 500,
                deductions_total: 200,
                employer_sign_name:
                    form.employer_sign_name || "Şirket Yetkilisi",
                employer_sign_title:
                    form.employer_sign_title || "İK Müdürü",
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
        a.download = "nftpayroll-ornek-payroll.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };


    const handleConfirmImport = async () => {
        if (!importPreview || !importPreview.validPayloads.length) return;

        const items = importPreview.validPayloads;

        setBulkLoading(true);
        setBulkProgress({ total: items.length, processed: 0 });

        const chunkSize = 200;
        let success = 0;
        let failed = 0;
        let payrollGroupId = null; // backend'in ürettiği id'yi tutacağız

        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);

            try {
                const res = await bulkCreatePayrollsApi(
                    companyId,
                    employeeId,
                    chunk,
                    payrollGroupId
                );

                // apiFetch JSON döndürüyor varsayımı:
                const createdItems = res.created || [];
                const failedItems = res.failed || [];

                success += createdItems.length;
                failed += failedItems.length;

                // Group id'yi ilk response'tan al
                if (!payrollGroupId && res.payroll_group_id) {
                    payrollGroupId = res.payroll_group_id;
                }

                setPayrolls((prev) => [...createdItems, ...prev]);

                setBulkProgress((prev) =>
                    prev
                        ? {
                            ...prev,
                            processed: Math.min(
                                prev.total,
                                prev.processed + chunk.length
                            ),
                        }
                        : { total: items.length, processed: chunk.length }
                );
            } catch (err) {
                console.error("Bulk import error:", err);
                failed += chunk.length;
                const msg =
                    err.response?.data?.message ||
                    err.message ||
                    "Bulk içe aktarma sırasında bilinmeyen hata.";
                setBulkError(msg);
            }
        }

        setBulkLoading(false);
        setShowImportModal(false);

        refreshPayrolls().catch(() => { });

        let msg = `${items.length} geçerli kaydın ${success} tanesi başarıyla içe aktarıldı.`;
        if (failed) {
            msg += ` ${failed} kayıtta hata oluştu.`;
        }
        if (payrollGroupId) {
            msg += ` Grup ID: ${payrollGroupId}`;
        }

        showToast(msg, failed ? "warning" : "success");
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
                        <div className="flex flex-col lg:flex-row gap-4 items-start">
                            {/* Sol: normal form */}
                            <div className="flex-1 w-full">
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
                                                <div className="space-y-1 w-auto w-[30%]">
                                                    <label className="text-slate-600">Para Birimi</label>
                                                    <select
                                                        name="currency"
                                                        value={form.currency}
                                                        onChange={handleChange}
                                                        className="w-full h-[34px] border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                                    >
                                                        <option value="TRY">TRY</option>
                                                        <option value="USD">USD</option>
                                                        <option value="EUR">EUR</option>
                                                    </select>
                                                </div>


                                                <div className="space-y-1 flex-1">
                                                    <label className="text-slate-600">Brüt Ücret</label>
                                                    <input
                                                        type="text"
                                                        name="gross_salary"
                                                        value={form.gross_salary}
                                                        onChange={handleChange}
                                                        onBlur={(e) =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                gross_salary: formatCurrencyTR(e.target.value),
                                                            }))
                                                        }
                                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                                        required
                                                    />


                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-slate-600">Net Ücret</label>
                                            <input
                                                type="text"
                                                step="0.01"
                                                name="net_salary"
                                                value={form.net_salary}
                                                onChange={handleChange}
                                                onBlur={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        net_salary: formatCurrencyTR(e.target.value),
                                                    }))
                                                }
                                                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-slate-600">Bonus / Prim</label>
                                            <input
                                                type="text"
                                                step="0.01"
                                                name="bonus"
                                                value={form.bonus}
                                                onChange={handleChange}
                                                onBlur={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        bonus: formatCurrencyTR(e.target.value),
                                                    }))
                                                }
                                                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                                placeholder="Opsiyonel"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                        <div className="space-y-1">
                                            <label className="text-slate-600">Toplam Kesinti</label>
                                            <input
                                                type="text"
                                                step="0.01"
                                                name="deductions_total"
                                                value={form.deductions_total}
                                                onChange={handleChange}
                                                onBlur={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        deductions_total: formatCurrencyTR(e.target.value),
                                                    }))
                                                }
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
                            {/* Sağ: JSON Dropzone */}
                            <div className="w-full md:w-[100%] lg:w-[33%]">
                                <div
                                    onDragOver={handleDropzoneDragOver}
                                    onDragLeave={handleDropzoneDragLeave}
                                    onDrop={handleDropzoneDrop}
                                    className={
                                        "border-2 border-dashed rounded-lg p-4 text-xs md:text-sm " +
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
                                        Tek bir bordro veya 1000+ bordro içeren .json dosyanızı buraya
                                        sürükleyip bırakın veya dosya seçin.
                                    </p>
                                    <p className="text-[11px] text-slate-400 text-center">
                                        Format: &#123;...&#125; veya [&#123;...&#125;, &#123;...&#125;]
                                    </p>

                                    <div className="mt-2 flex flex-wrap gap-2 justify-center">
                                        <label className="inline-flex items-center gap-2 px-3 py-1 rounded border border-slate-300 text-xs font-medium cursor-pointer hover:bg-slate-100">
                                            Dosya Seç
                                            <input
                                                type="file"
                                                accept="application/json,.json"
                                                className="hidden"
                                                onChange={handleDropzoneFileChange}
                                                disabled={bulkLoading}
                                            />
                                        </label>

                                        <button
                                            type="button"
                                            onClick={handleDownloadSampleJson}
                                            className="inline-flex items-center px-3 py-1 rounded border border-slate-300 text-xs font-medium hover:bg-slate-100"
                                        >
                                            Örnek JSON indir
                                        </button>
                                    </div>

                                    {/* Örnek JSON göster */}
                                    <details className="mt-2 w-full">
                                        <summary className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-700">
                                            Örnek JSON formatını göster
                                        </summary>
                                        <pre className="mt-2 text-[11px] bg-slate-900 text-slate-100 rounded p-2 overflow-auto max-h-48">
                                            {`[
  {
    "national_id": "11111111111",
    "period_start": "2025-01-01",
    "period_end": "2025-01-31",
    "payment_date": "2025-02-10",
    "currency": "TRY",
    "gross_salary": 85000,
    "net_salary": 65000,
    "bonus": 5000,
    "deductions_total": 2000,
    "employer_sign_name": "Şirket Yetkilisi",
    "employer_sign_title": "İK Müdürü",
    "batch_id": "2025-01",
    "external_batch_ref": "HR-SYSTEM-2025-01",
    "external_ref": "PAYROLL-0001"
  }
]`}
                                        </pre>
                                    </details>

                                    {/* Progress bar */}
                                    {bulkProgress && (
                                        <div className="w-full mt-3">
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
                                            <p className="mt-1 text-[11px] text-slate-500 text-center">
                                                {bulkProgress.processed} / {bulkProgress.total} kayıt
                                                işlendi
                                            </p>
                                        </div>
                                    )}

                                    {bulkLoading && (
                                        <p className="mt-2 text-[11px] text-slate-500">
                                            JSON import devam ediyor, lütfen sayfadan ayrılmayın...
                                        </p>
                                    )}

                                    {bulkError && (
                                        <p className="mt-2 text-[11px] text-red-600 text-center">
                                            {bulkError}
                                        </p>
                                    )}

                                    {bulkStats && !bulkLoading && (
                                        <p className="mt-2 text-[11px] text-emerald-600 text-center">
                                            Toplam {bulkStats.total} kaydın{" "}
                                            {bulkStats.imported} tanesi başarıyla eklendi,
                                            {bulkStats.failed > 0 && (
                                                <> {bulkStats.failed} tanesi hatalı.</>
                                            )}
                                        </p>
                                    )}

                                    {/* Hatalı kayıt detayları */}
                                    {bulkFailedItems.length > 0 && (
                                        <div className="mt-3 w-full">
                                            <button
                                                type="button"
                                                onClick={() => setShowFailedDetails((v) => !v)}
                                                className="text-[11px] text-red-600 underline underline-offset-2"
                                            >
                                                {showFailedDetails
                                                    ? "Hatalı kayıt listesini gizle"
                                                    : `Hatalı kayıtları göster (${bulkFailedItems.length})`}
                                            </button>

                                            {showFailedDetails && (
                                                <div className="mt-2 max-h-48 overflow-auto border border-red-200 rounded p-2 bg-red-50">
                                                    {bulkFailedItems.map((item) => (
                                                        <div
                                                            key={item.index}
                                                            className="mb-2 border-b border-red-100 pb-2 last:border-b-0 last:pb-0"
                                                        >
                                                            <p className="text-[11px] font-semibold text-red-700">
                                                                Kayıt #{item.index + 1}
                                                            </p>
                                                            {item.data && (
                                                                <p className="text-[11px] text-slate-700">
                                                                    {item.data.period_start} -{" "}
                                                                    {item.data.period_end} | Brüt:{" "}
                                                                    {item.data.gross_salary} | Net:{" "}
                                                                    {item.data.net_salary}
                                                                </p>
                                                            )}
                                                            {item.errors?.length > 0 && (
                                                                <ul className="mt-1 text-[11px] text-red-700 list-disc list-inside">
                                                                    {item.errors.map((err, i) => (
                                                                        <li key={i}>{err}</li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
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
                                        <th className="p-2 text-left">NFT</th>
                                        <th className="p-2 text-left">Dönem</th>
                                        <th className="p-2 text-left">Tutar</th>
                                        <th className="p-2 text-left">Status</th>
                                        <th className="p-2 text-left">Aksiyonlar</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {payrolls.map((p) => (
                                        <tr key={p.id} className="border-b">
                                            <td className="p-2">{p.id}</td>

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

                                            <td className="p-2">
                                                {p.period_start} → {p.period_end}
                                            </td>
                                            <td className="p-2">{p.net_salary}</td>
                                            <td className="p-2">{badge(p.status)}</td>



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

            <ImportPreviewModal
                open={showImportModal}
                onClose={() => {
                    if (!bulkLoading) setShowImportModal(false);
                }}
                preview={importPreview}
                onConfirm={handleConfirmImport}
                loading={bulkLoading}
            />
        </div>
    );
}
