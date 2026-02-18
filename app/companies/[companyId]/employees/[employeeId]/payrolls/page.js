"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import DataTable from "@/app/components/DataTable";
import {
    bulkCreatePayrollsApi,
    fetchPayrolls,
    createPayrollApi,
    queuePayrollApi,
    payrollStatusApi,
    retryMintApi,
    decryptPayrollApi
} from "@/lib/payrolls";
import { useToast } from "@/app/components/ToastProvider";
import ImportPreviewModal from "@/app/components/ImportPreviewModal";
import Select2 from "@/app/components/Select2";
import DatePicker from "@/app/components/DatePicker";
import { formatDateDDMMYYYY } from "@/lib/date";
import { fetchEmployees } from "@/lib/employees";
import { fetchCompanies } from "@/lib/companies";
import { Eye, Plus, Upload, Clock3, RotateCcw, Shield, FileLock2 } from "lucide-react";

const currencyOptions = [
    { value: "TRY", label: "TRY" },
    { value: "USD", label: "USD" },
    { value: "EUR", label: "EUR" },
];

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
    const [importPreview, setImportPreview] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showJsonImportModal, setShowJsonImportModal] = useState(false);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filters, setFilters] = useState({
        companyId: String(companyId),
        employeeId: String(employeeId),
        status: "all",
        from: "",
        to: "",
    });



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
        setFilters((prev) => ({ ...prev, companyId: String(companyId), employeeId: String(employeeId) }));
    }, [companyId, employeeId]);

    useEffect(() => {
        if (!ready) return;
        fetchEmployees(companyId)
            .then((resp) => {
                const list = Array.isArray(resp) ? resp : resp?.data || [];
                setEmployees(list);
            })
            .catch(() => {
                setEmployees([]);
            });
    }, [ready, companyId]);

    useEffect(() => {
        if (!ready) return;
        fetchCompanies()
            .then((resp) => {
                const list = Array.isArray(resp) ? resp : resp?.data || [];
                setCompanies(list);
            })
            .catch(() => setCompanies([]));
    }, [ready]);

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
        setShowJsonImportModal(false);
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
        setShowJsonImportModal(false);
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
        if (!form.period_start || !form.period_end) return false;

        setCreating(true);
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
            return true;
        } catch (err) {
            console.error(err);
            setError(err.message || "Kayıt sırasında hata oluştu.");
            return false;
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
                    form.employer_sign_name || "Firma Yetkilisi",
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

    const employeeOptions = useMemo(() => {
        const opts = (employees || []).map((emp) => ({
            value: String(emp.id),
            label: [emp.name, emp.surname].filter(Boolean).join(" ") || `Çalışan #${emp.id}`,
        }));
        return opts;
    }, [employees]);

    const companyOptions = useMemo(() => {
        return (companies || []).map((company) => ({
            value: String(company.id),
            label: company.name || `Firma #${company.id}`,
        }));
    }, [companies]);

    const statusOptions = useMemo(() => {
        const statuses = Array.from(new Set((payrolls || []).map((p) => p.status).filter(Boolean)));
        const mapped = statuses.map((status) => ({ value: status, label: status }));
        return [{ value: "all", label: "Tüm Durumlar" }, ...mapped];
    }, [payrolls]);

    const filteredPayrolls = useMemo(() => {
        return (payrolls || []).filter((p) => {
            if (filters.status !== "all" && p.status !== filters.status) return false;
            if (filters.from && p.period_start && p.period_start < filters.from) return false;
            if (filters.to && p.period_end && p.period_end > filters.to) return false;
            return true;
        });
    }, [payrolls, filters.status, filters.from, filters.to]);

    const payrollColumns = [
        {
            key: "serial",
            header: "#",
            sortable: false,
            render: (_row, _rowIndex, serial) => <span className="text-xs text-slate-500">{serial}</span>,
        },
        {
            key: "period",
            header: "Dönem",
            accessor: (row) => `${row.period_start || ""}-${row.period_end || ""}`,
            render: (row) => (
                <span className="text-xs">
                    {formatDateDDMMYYYY(row.period_start)} - {formatDateDDMMYYYY(row.period_end)}
                </span>
            ),
        },
        {
            key: "payment_date",
            header: "Ödeme",
            render: (row) => <span className="text-xs">{formatDateDDMMYYYY(row.payment_date)}</span>,
        },
        {
            key: "net_salary",
            header: "Net",
            render: (row) => (
                <span className="text-xs font-medium">
                    {row.net_salary ?? "-"} {row.currency || ""}
                </span>
            ),
        },
        {
            key: "nft",
            header: "NFT",
            sortable: false,
            render: (row) => {
                const nft = row.nft;
                if (!nft) return <span className="text-xs text-slate-400">Yok</span>;
                return (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium">#{nft.token_id || "-"}</span>
                        {nft.ipfs_cid ? (
                            <a
                                href={`https://ipfs.io/ipfs/${nft.ipfs_cid}`}
                                target="_blank"
                                rel="noreferrer"
                                title="IPFS"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-600 hover:underline"
                            >
                                IPFS
                            </a>
                        ) : null}
                    </div>
                );
            },
        },
        {
            key: "status",
            header: "Durum",
            render: (row) => badge(row.status),
        },
        {
            key: "actions",
            header: "Aksiyon",
            sortable: false,
            render: (row) => (
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        title="Detay"
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/companies/${companyId}/employees/${employeeId}/payrolls/${row.id}`);
                        }}
                        className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-1.5 text-slate-700 hover:bg-slate-100"
                    >
                        <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        title="Queue"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleQueueMint(row.id);
                        }}
                        className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100"
                    >
                        <Clock3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        title="Durum Kontrol"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleStatus(row.id);
                        }}
                        className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-100"
                    >
                        <Shield className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        title="Retry Mint"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(row.id);
                        }}
                        className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        title="Decrypt"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDecrypt(row.id);
                        }}
                        className="inline-flex items-center justify-center rounded-md border border-violet-200 bg-violet-50 p-1.5 text-violet-700 hover:bg-violet-100"
                    >
                        <FileLock2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ];


    // ---- Render (guard) ----
    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
                Yükleniyor...
            </div>
        );
    }

    return (
        <div className="min-h-screen flex ta-shell">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <Navbar />

                <main className="ta-page space-y-6">
                    <div className="flex items-center justify-between gap-3">
                        <h1 className="text-xl font-semibold">Bordrolar</h1>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowJsonImportModal(true)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            >
                                <Upload className="h-4 w-4" />
                                Toplu JSON Import
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(true)}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#111b3a] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d1630]"
                            >
                                <Plus className="h-4 w-4" />
                                Yeni Bordro Oluştur
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded">
                            {error}
                        </div>
                    )}

                    <section className="ta-card p-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            <div>
                                <label className="mb-1 block text-xs text-slate-600">Firma Filtresi</label>
                                <Select2
                                    name="companyFilter"
                                    value={filters.companyId}
                                    onChange={async (e) => {
                                        const nextCompanyId = e.target.value;
                                        setFilters((prev) => ({ ...prev, companyId: nextCompanyId }));
                                        try {
                                            const resp = await fetchEmployees(nextCompanyId);
                                            const list = Array.isArray(resp) ? resp : resp?.data || [];
                                            const targetEmployeeId =
                                                list.find((emp) => String(emp.id) === String(filters.employeeId))?.id ||
                                                list[0]?.id;
                                            if (targetEmployeeId) {
                                                router.push(
                                                    `/companies/${nextCompanyId}/employees/${targetEmployeeId}/payrolls`
                                                );
                                                return;
                                            }
                                            router.push(`/companies/${nextCompanyId}/employees`);
                                        } catch {
                                            router.push(`/companies/${nextCompanyId}/employees`);
                                        }
                                    }}
                                    options={companyOptions}
                                    isSearchable
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-slate-600">Çalışan Filtresi</label>
                                <Select2
                                    name="employeeFilter"
                                    value={filters.employeeId}
                                    onChange={(e) => {
                                        const nextEmployeeId = e.target.value;
                                        setFilters((prev) => ({ ...prev, employeeId: nextEmployeeId }));
                                        router.push(`/companies/${companyId}/employees/${nextEmployeeId}/payrolls`);
                                    }}
                                    options={employeeOptions}
                                    isSearchable
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-slate-600">Başlangıç Tarihi</label>
                                <DatePicker
                                    name="from"
                                    value={filters.from}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
                                    placeholder="Başlangıç"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-slate-600">Bitiş Tarihi</label>
                                <DatePicker
                                    name="to"
                                    value={filters.to}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
                                    placeholder="Bitiş"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-slate-600">Status</label>
                                <Select2
                                    name="status"
                                    value={filters.status}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                                    options={statusOptions}
                                />
                            </div>
                        </div>
                    </section>

                    {bulkProgress ? (
                        <div className="ta-card p-3 text-xs text-slate-600">
                            Toplu JSON: {bulkProgress.processed}/{bulkProgress.total}
                        </div>
                    ) : null}
                    {bulkError ? <div className="text-xs text-red-600">{bulkError}</div> : null}
                    {bulkStats && !bulkLoading ? (
                        <div className="text-xs text-emerald-600">
                            Toplam {bulkStats.total} kaydın {bulkStats.imported} tanesi eklendi
                            {bulkStats.failed > 0 ? `, ${bulkStats.failed} tanesi hatalı.` : "."}
                        </div>
                    ) : null}

                    {loading ? (
                        <div className="ta-card p-6 text-sm text-slate-500">Yükleniyor...</div>
                    ) : (
                        <DataTable
                            columns={payrollColumns}
                            rows={filteredPayrolls}
                            rowKey={(row) => row.id}
                            emptyText="Bordro kaydı bulunamadı."
                            defaultPageSize={10}
                            enableSearch
                            searchPlaceholder="Dönem, status, tutar ara..."
                            searchableKeys={["id", "status", "period_start", "period_end", "net_salary", "gross_salary"]}
                            onRowClick={(row) =>
                                router.push(`/companies/${companyId}/employees/${employeeId}/payrolls/${row.id}`)
                            }
                        />
                    )}

                    {isCreateModalOpen ? (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div
                                className="absolute inset-0 bg-slate-900/50"
                                onClick={() => {
                                    if (!creating) setCreateModalOpen(false);
                                }}
                            />
                            <div className="relative w-full max-w-4xl ta-card p-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold">Yeni Bordro Oluştur</h2>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!creating) setCreateModalOpen(false);
                                        }}
                                        className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <form
                                    onSubmit={async (e) => {
                                        const ok = await handleSubmit(e);
                                        if (ok) setCreateModalOpen(false);
                                    }}
                                    className="space-y-3"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                        <div className="space-y-1">
                                            <label className="text-slate-600">Dönem Başlangıç</label>
                                            <DatePicker
                                                name="period_start"
                                                value={form.period_start}
                                                onChange={handleChange}
                                                placeholder="Dönem başlangıç"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-slate-600">Dönem Bitiş</label>
                                            <DatePicker
                                                name="period_end"
                                                value={form.period_end}
                                                onChange={handleChange}
                                                placeholder="Dönem bitiş"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-slate-600">Ödeme Tarihi</label>
                                            <DatePicker
                                                name="payment_date"
                                                value={form.payment_date}
                                                onChange={handleChange}
                                                placeholder="Ödeme tarihi"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                        <div className="space-y-1">
                                            <label className="text-slate-600">Para Birimi</label>
                                            <Select2
                                                name="currency"
                                                value={form.currency}
                                                onChange={handleChange}
                                                options={currencyOptions}
                                                placeholder="Para birimi"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-slate-600">Brüt Ücret</label>
                                            <input
                                                type="text"
                                                name="gross_salary"
                                                value={form.gross_salary}
                                                onChange={handleChange}
                                                onBlur={(e) =>
                                                    setForm((prev) => ({ ...prev, gross_salary: formatCurrencyTR(e.target.value) }))
                                                }
                                                className="w-full border rounded px-3 py-2 text-sm"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-slate-600">Net Ücret</label>
                                            <input
                                                type="text"
                                                name="net_salary"
                                                value={form.net_salary}
                                                onChange={handleChange}
                                                onBlur={(e) =>
                                                    setForm((prev) => ({ ...prev, net_salary: formatCurrencyTR(e.target.value) }))
                                                }
                                                className="w-full border rounded px-3 py-2 text-sm"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                        <div className="space-y-1">
                                            <label className="text-slate-600">Bonus / Prim</label>
                                            <input
                                                type="text"
                                                name="bonus"
                                                value={form.bonus}
                                                onChange={handleChange}
                                                onBlur={(e) =>
                                                    setForm((prev) => ({ ...prev, bonus: formatCurrencyTR(e.target.value) }))
                                                }
                                                className="w-full border rounded px-3 py-2 text-sm"
                                                placeholder="Opsiyonel"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-slate-600">Toplam Kesinti</label>
                                            <input
                                                type="text"
                                                name="deductions_total"
                                                value={form.deductions_total}
                                                onChange={handleChange}
                                                onBlur={(e) =>
                                                    setForm((prev) => ({ ...prev, deductions_total: formatCurrencyTR(e.target.value) }))
                                                }
                                                className="w-full border rounded px-3 py-2 text-sm"
                                                placeholder="Opsiyonel"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-slate-600">İmzalayan (Ad Soyad)</label>
                                            <input
                                                name="employer_sign_name"
                                                value={form.employer_sign_name}
                                                onChange={handleChange}
                                                className="w-full border rounded px-3 py-2 text-sm"
                                                placeholder="Örn: Ayşe Demir"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1 text-sm">
                                        <label className="text-slate-600">İmzalayan Ünvan</label>
                                        <input
                                            name="employer_sign_title"
                                            value={form.employer_sign_title}
                                            onChange={handleChange}
                                            className="w-full border rounded px-3 py-2 text-sm"
                                            placeholder="Örn: İK Müdürü"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCreateModalOpen(false)}
                                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                                        >
                                            Vazgeç
                                        </button>
                                        <button
                                            type="submit"
                                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                                        >
                                            Kaydet
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    ) : null}

                    {showJsonImportModal ? (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div
                                className="absolute inset-0 bg-slate-900/50"
                                onClick={() => {
                                    if (!bulkLoading) setShowJsonImportModal(false);
                                }}
                            />
                            <div className="relative w-full max-w-2xl ta-card p-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold">Toplu JSON Import</h2>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!bulkLoading) setShowJsonImportModal(false);
                                        }}
                                        className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div
                                    onDragOver={handleDropzoneDragOver}
                                    onDragLeave={handleDropzoneDragLeave}
                                    onDrop={handleDropzoneDrop}
                                    className={[
                                        "rounded-xl border-2 border-dashed p-6 text-center",
                                        dragActive ? "border-slate-600 bg-slate-100" : "border-slate-300 bg-slate-50",
                                    ].join(" ")}
                                >
                                    <p className="text-sm font-medium text-slate-700">
                                        JSON dosyanızı sürükleyip bırakın
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Tek bir kayıt veya toplu kayıt içeren `.json` dosyası yükleyebilirsiniz.
                                    </p>

                                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
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
                                            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                        >
                                            Örnek JSON İndir
                                        </button>
                                    </div>
                                </div>

                                {bulkProgress ? (
                                    <div className="mt-4 text-xs text-slate-600">
                                        Toplu JSON: {bulkProgress.processed}/{bulkProgress.total}
                                    </div>
                                ) : null}
                                {bulkError ? <div className="mt-2 text-xs text-red-600">{bulkError}</div> : null}
                            </div>
                        </div>
                    ) : null}
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
                                        {formatDateDDMMYYYY(decryptModal.payload.period_start)}
                                    </div>
                                )}

                                {"period_end" in decryptModal.payload && (
                                    <div>
                                        <span className="font-medium">Period End: </span>
                                        {formatDateDDMMYYYY(decryptModal.payload.period_end)}
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
