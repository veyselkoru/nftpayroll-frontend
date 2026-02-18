"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, Upload, Users, Landmark, BadgeCheck, MapPin, House, Mail, Phone } from "lucide-react";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import { fetchCompanyDetail, fetchCompanyNfts } from "@/lib/companies";
import { fetchEmployees } from "@/lib/employees";
import { useToast } from "@/app/components/ToastProvider";
import ImportPreviewModal from "@/app/components/ImportPreviewModal";
import { bulkCreateCompanyPayrollsApi } from "@/lib/payrolls";
import { formatDateTimeDDMMYYYY } from "@/lib/date";

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

  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkStats, setBulkStats] = useState(null);
  const [bulkProgress, setBulkProgress] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const isActiveMintStatus = useCallback(
    (status) =>
      ["pending", "queued", "sending", "minting", "processing"].includes(String(status || "").toLowerCase()),
    []
  );

  const hasActiveMints = useCallback(
    (list) => Array.isArray(list) && list.some((row) => isActiveMintStatus(row?.status)),
    [isActiveMintStatus]
  );

  useEffect(() => {
    if (!ready || !companyId) return;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const c = await fetchCompanyDetail(companyId);
        setCompany(c);

        try {
          const empRes = await fetchEmployees(companyId);
          const list = Array.isArray(empRes) ? empRes : empRes.data || [];
          setEmployees(list);
        } catch {
          setEmployees([]);
        }

        try {
          const nftsRes = await fetchCompanyNfts(companyId);
          const list = nftsRes.nfts || nftsRes.data || [];
          setNfts(list);
          setAutoRefresh(hasActiveMints(list));
        } catch {
          setNfts([]);
          setAutoRefresh(false);
        }
      } catch (err) {
        setError(err.message || "Firma detayı alınamadı");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [ready, companyId, hasActiveMints]);

  const reloadNfts = useCallback(async () => {
    const nftsRes = await fetchCompanyNfts(companyId);
    const list = nftsRes.nfts || nftsRes.data || [];
    setNfts(list);
    setAutoRefresh(hasActiveMints(list));
    return list;
  }, [companyId, hasActiveMints]);

  useEffect(() => {
    if (!ready || !companyId || !autoRefresh) return;

    const intervalId = setInterval(() => {
      reloadNfts().catch(() => {});
    }, 4000);

    return () => clearInterval(intervalId);
  }, [ready, companyId, autoRefresh, reloadNfts]);

  const goBack = () => router.push("/companies");

  const statusBadge = (status) => {
    const map = {
      pending: "bg-yellow-100 text-yellow-700",
      sending: "bg-blue-100 text-blue-700",
      sent: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-1 text-[11px] rounded ${
          map[status] || "bg-gray-100 text-gray-700"
        }`}
      >
        {status || "unknown"}
      </span>
    );
  };

  const getEmployeeFullName = (n) => {
    if (n.employee && String(n.employee).trim()) return n.employee;
    const first = n.employee_name || n.name || "";
    const last = n.employee_surname || n.surname || "";
    const full = `${first} ${last}`.trim();
    return full || "-";
  };

  const getEmployeeTitle = (n) => {
    return n.position || n.employee_position || n.title || n.employee_title || "-";
  };

  const validateAndNormalizeCompanyItem = (item, index) => {
    const errors = [];
    const obj = typeof item === "object" && item !== null ? item : {};
    const employeeObj = obj.employee && typeof obj.employee === "object" ? obj.employee : null;
    const payrollObj = obj.payroll && typeof obj.payroll === "object" ? obj.payroll : null;

    const employee = employeeObj || {
      national_id: obj.national_id,
      name: obj.name ?? null,
      surname: obj.surname ?? null,
      employee_code: obj.employee_code ?? null,
      position: obj.position ?? null,
      department: obj.department ?? null,
      status: obj.status ?? "active",
    };

    const payroll = payrollObj || {
      period_start: obj.period_start,
      period_end: obj.period_end,
      payment_date: obj.payment_date ?? null,
      currency: obj.currency || "TRY",
      gross_salary: obj.gross_salary,
      net_salary: obj.net_salary,
      bonus: obj.bonus,
      deductions_total: obj.deductions_total,
      employer_sign_name: obj.employer_sign_name ?? null,
      employer_sign_title: obj.employer_sign_title ?? null,
      batch_id: obj.batch_id ?? null,
      external_batch_ref: obj.external_batch_ref ?? null,
      external_ref: obj.external_ref ?? null,
    };

    const nationalId = employee?.national_id;
    const periodStart = payroll?.period_start;
    const periodEnd = payroll?.period_end;
    const grossSalary = payroll?.gross_salary;
    const netSalary = payroll?.net_salary;

    if (!nationalId) {
      errors.push("employee.national_id (TC) alanı zorunlu.");
    } else if (!/^\d{11}$/.test(String(nationalId))) {
      errors.push("employee.national_id 11 haneli ve sadece rakamlardan oluşmalı.");
    }

    if (!periodStart) errors.push("payroll.period_start alanı zorunlu.");
    if (!periodEnd) errors.push("payroll.period_end alanı zorunlu.");
    if (grossSalary === undefined || grossSalary === null || grossSalary === "") {
      errors.push("payroll.gross_salary alanı zorunlu.");
    }
    if (netSalary === undefined || netSalary === null || netSalary === "") {
      errors.push("payroll.net_salary alanı zorunlu.");
    }

    const toNumber = (value, field) => {
      if (value === undefined || value === null || value === "") return null;
      const n = Number(typeof value === "string" ? value.replace(/\./g, "").replace(",", ".") : value);
      if (Number.isNaN(n)) {
        errors.push(`${field} sayısal olmalı.`);
        return null;
      }
      return n;
    };

    const normalized = {
      employee: {
        national_id: nationalId ? String(nationalId) : null,
        name: employee?.name ?? null,
        surname: employee?.surname ?? null,
        employee_code: employee?.employee_code ?? null,
        position: employee?.position ?? null,
        department: employee?.department ?? null,
        status: employee?.status ?? "active",
      },
      payroll: {
        period_start: periodStart,
        period_end: periodEnd,
        payment_date: payroll?.payment_date ?? null,
        currency: payroll?.currency || "TRY",
        gross_salary: toNumber(grossSalary, "payroll.gross_salary"),
        net_salary: toNumber(netSalary, "payroll.net_salary"),
        bonus: toNumber(payroll?.bonus, "payroll.bonus"),
        deductions_total: toNumber(payroll?.deductions_total, "payroll.deductions_total"),
        employer_sign_name: payroll?.employer_sign_name ?? null,
        employer_sign_title: payroll?.employer_sign_title ?? null,
        batch_id: payroll?.batch_id ?? null,
        external_batch_ref: payroll?.external_batch_ref ?? null,
        external_ref: payroll?.external_ref ?? null,
      },
      original_index: index,
    };

    if (normalized.payroll.gross_salary === null) errors.push("payroll.gross_salary sayısal olmalı.");
    if (normalized.payroll.net_salary === null) errors.push("payroll.net_salary sayısal olmalı.");

    if (errors.length > 0) {
      const employeeName = [employee?.name, employee?.surname].filter(Boolean).join(" ");
      const summary = `#${index + 1} - TC: ${nationalId || "?"}${
        employeeName ? ` (${employeeName})` : ""
      }, dönem: ${periodStart || "?"} - ${periodEnd || "?"}, net: ${normalized.payroll.net_salary ?? "?"}`;
      return { ok: false, index, errors, summary };
    }

    return { ok: true, index, normalized };
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

    const rawItems = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [parsed];
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

    setImportPreview({
      fileName: file.name,
      total: rawItems.length,
      validCount: validPayloads.length,
      invalidCount: invalidItems.length,
      invalidItems,
      validPayloads,
    });
    setShowImportModal(true);

    showToast(
      `${rawItems.length} kayıt analiz edildi: ${validPayloads.length} geçerli, ${invalidItems.length} hatalı.`,
      invalidItems.length > 0 ? "warning" : "success"
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
        employee: {
          national_id: "11111111111",
          name: "Ahmet",
          surname: "Yılmaz",
          employee_code: "EMP-0001",
          position: "Personel",
          department: "Operasyon",
          status: "active",
        },
        payroll: {
          period_start: "2025-01-01",
          period_end: "2025-01-31",
          payment_date: "2025-02-10",
          currency: "TRY",
          gross_salary: 85000,
          net_salary: 65000,
          bonus: 5000,
          deductions_total: 2000,
          employer_sign_name: "Firma Yetkilisi",
          employer_sign_title: "İK Müdürü",
          batch_id: "2025-01",
          external_batch_ref: "HR-SYSTEM-2025-01",
          external_ref: "PAYROLL-0001",
        },
      },
    ];

    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
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
    setBulkProgress({ total: items.length, processed: 0 });

    const chunkSize = 200;
    let success = 0;
    let failed = 0;
    let payrollGroupId = null;
    const failedDetails = [];

    try {
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);

        const res = await bulkCreateCompanyPayrollsApi(companyId, chunk, payrollGroupId);

        const createdItems = res.created || res.successful || res.imported_items || [];
        const failedItems = res.failed || res.failed_items || res.errors || [];

        const createdCount = typeof res.created_count === "number" ? res.created_count : createdItems.length;
        const failedCount = typeof res.failed_count === "number" ? res.failed_count : failedItems.length;

        success += createdCount;
        failed += failedCount;

        if (!payrollGroupId && res.payroll_group_id) payrollGroupId = res.payroll_group_id;
        if (!payrollGroupId && res.group_id) payrollGroupId = res.group_id;

        if (Array.isArray(failedItems) && failedItems.length > 0) {
          failedItems.forEach((f, idx) => {
            const line = f?.message || f?.error || JSON.stringify(f);
            failedDetails.push(`${i + idx + 1}. kayıt: ${line}`);
          });
        }

        setBulkProgress((prev) =>
          prev
            ? { ...prev, processed: Math.min(prev.total, prev.processed + chunk.length) }
            : { total: items.length, processed: chunk.length }
        );
      }

      setBulkStats({ total: items.length, imported: success, failed, payrollGroupId, failedDetails });

      const detailSuffix = failedDetails.length > 0 ? ` İlk hata: ${failedDetails[0]}` : "";
      showToast(
        `Toplam ${items.length} kaydın ${success} tanesi eklendi, ${failed} tanesi hatalı.${detailSuffix}`,
        failed ? "warning" : "success"
      );

      setShowImportModal(false);
      setShowUploadModal(false);
      setAutoRefresh(true);
      await reloadNfts();
    } catch (err) {
      const msg = err?.message || "Toplu bordro içe aktarma sırasında bir hata oluştu.";
      setBulkError(msg);
      showToast(msg, "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const payrollCount = (() => {
    const ids = nfts
      .map((n) => n.payroll_id || n.payrollId)
      .filter((v) => v !== null && v !== undefined && v !== "");
    if (ids.length > 0) return new Set(ids).size;
    return nfts.length;
  })();

  const summaryCards = [
    {
      title: "Çalışan Sayısı",
      value: employees.length,
      desc: "Çalışan listesine git",
      icon: Users,
      onClick: () => router.push(`/companies/${companyId}/employees`),
    },
    {
      title: "Bordro Sayısı",
      value: payrollCount,
      desc: "Toplam bordro kaydı",
      icon: Building2,
      onClick: () => router.push(`/companies/payrolls?companyId=${companyId}`),
    },
  ];

  const recentEmployees = useMemo(
    () =>
      [...employees]
        .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
        .slice(0, 10),
    [employees]
  );

  const recentNfts = useMemo(
    () =>
      [...nfts]
        .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
        .slice(0, 10),
    [nfts]
  );

  const monthlyNftSeries = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        key,
        label: d.toLocaleString("tr-TR", { month: "short" }),
        count: 0,
      });
    }

    const monthMap = new Map(months.map((m) => [m.key, m]));
    nfts.forEach((nft) => {
      const rawDate = nft.created_at_formatted || nft.created_at;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const item = monthMap.get(key);
      if (item) item.count += 1;
    });

    return months;
  }, [nfts]);

  const maxMonthlyNft = useMemo(
    () => Math.max(1, ...monthlyNftSeries.map((item) => item.count)),
    [monthlyNftSeries]
  );

  const profileItems = [
    { label: "Firma Türü", value: company?.type || "-", icon: Building2 },
    { label: "Vergi No", value: company?.tax_number || "-", icon: Landmark },
    { label: "Ticaret Sicil No", value: company?.registration_number || "-", icon: BadgeCheck },
    { label: "Ülke / Şehir", value: [company?.country, company?.city].filter(Boolean).join(" / ") || "-", icon: MapPin },
    { label: "Adres", value: company?.address || "-", icon: House },
    { label: "İletişim E-posta", value: company?.contact_email || "-", icon: Mail },
    { label: "İletişim Telefon", value: company?.contact_phone || "-", icon: Phone },
  ];

  return (
    <div className="min-h-screen flex ta-shell">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Navbar />

        <main className="ta-page space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <button onClick={goBack} className="text-xs text-slate-500 hover:text-slate-800 mb-1">
                ← Firma listesine dön
              </button>
              <h1 className="text-2xl font-bold">{company?.name || `Firma #${companyId}`}</h1>
              <p className="text-xs text-slate-500">ID: {companyId}</p>
            </div>

            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
            >
              <Upload className="w-4 h-4" />
              Toplu JSON Import
            </button>
          </div>

          {error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">{error}</div>
          ) : null}

          {loading ? (
            <div className="text-sm text-slate-500">Yükleniyor...</div>
          ) : !company ? (
            <div className="text-sm text-slate-500">Firma bulunamadı.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
                <section className="ta-card p-4 space-y-4 xl:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {summaryCards.map((card) => {
                      const Icon = card.icon;
                      return (
                        <button
                          type="button"
                          key={card.title}
                          onClick={card.onClick}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-100 transition min-h-[120px]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs text-slate-500">{card.title}</div>
                              <div className="mt-2 text-2xl font-bold text-slate-900">{card.value}</div>
                              <div className="mt-1 text-[11px] text-slate-500">{card.desc} →</div>
                            </div>
                            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white text-slate-700 border border-slate-200">
                              <Icon className="w-4 h-4" />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-100 pt-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold">Aylık NFT</h2>
                      <span className="text-[11px] text-slate-500">Son 12 ay</span>
                    </div>
                    <div className="h-44 rounded-lg border border-slate-200 bg-slate-50 p-3 mt-3">
                      <div className="h-full flex items-end gap-2">
                        {monthlyNftSeries.map((item) => {
                          const h = Math.max(6, Math.round((item.count / maxMonthlyNft) * 100));
                          return (
                            <div key={item.key} className="flex-1 flex flex-col items-center justify-end gap-1">
                              <div className="text-[10px] text-slate-500">{item.count}</div>
                              <div
                                className="w-full max-w-7 rounded-md bg-[#4f6df5] hover:bg-[#3f5ae0] transition-all"
                                style={{ height: `${h}%` }}
                                title={`${item.label}: ${item.count} NFT`}
                              />
                              <div className="text-[10px] text-slate-600">{item.label}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="ta-card p-4 space-y-3 xl:col-span-1 xl:min-h-[316px]">
                  <h2 className="text-lg font-semibold">Firma Künyesi</h2>
                  <p className="text-xs text-slate-500">Firmaya ait temel kayıt bilgileri</p>
                  <div className="space-y-1.5">
                    {profileItems.map((item) => (
                      <div key={item.label} className="flex items-start gap-2.5 py-2 border-b border-slate-100 last:border-b-0">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                          <item.icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-500">{item.label}</p>
                          <p className="text-sm text-slate-800 break-words">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <section className="ta-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Son 10 Çalışan</h2>
                    <button
                      type="button"
                      onClick={() => router.push(`/companies/${companyId}/employees`)}
                      className="text-xs text-[#111b3a] hover:underline"
                    >
                      Tümünü Gör
                    </button>
                  </div>

                  <div className="space-y-2">
                    {recentEmployees.length === 0 ? (
                      <p className="text-xs text-slate-500">Çalışan kaydı yok.</p>
                    ) : (
                      recentEmployees.map((employee) => {
                        const fullName = [employee.name, employee.surname].filter(Boolean).join(" ") || `Çalışan #${employee.id}`;
                        return (
                          <button
                            key={employee.id}
                            type="button"
                            onClick={() => router.push(`/companies/${companyId}/employees/${employee.id}`)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-slate-900">{fullName}</p>
                                <p className="text-[11px] text-slate-500">{employee.position || "-"} • {employee.department || "-"}</p>
                              </div>
                              <span className="text-[11px] text-slate-500">#{employee.id}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="ta-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Son 10 NFT</h2>
                    <button
                      type="button"
                      onClick={() => router.push(`/companies/payrolls?companyId=${companyId}`)}
                      className="text-xs text-[#111b3a] hover:underline"
                    >
                      Tümünü Gör
                    </button>
                  </div>

                  <div className="space-y-2">
                    {recentNfts.length === 0 ? (
                      <p className="text-xs text-slate-500">NFT kaydı yok.</p>
                    ) : (
                      recentNfts.map((nft) => (
                        <div key={nft.id} className="rounded-lg border border-slate-200 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                #{nft.id} • {getEmployeeFullName(nft)}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Token: {nft.token_id ?? "-"} • {formatDateTimeDDMMYYYY(nft.created_at_formatted || nft.created_at)}
                              </p>
                            </div>
                            {statusBadge(nft.status)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </>
          )}

          {showUploadModal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-900/50"
                onClick={() => {
                  if (!bulkLoading) setShowUploadModal(false);
                }}
              />

              <div className="relative w-full max-w-xl ta-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Toplu JSON Import</h3>
                  <button
                    type="button"
                    className="text-slate-500 hover:text-slate-700"
                    onClick={() => {
                      if (!bulkLoading) setShowUploadModal(false);
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div
                  onDragOver={handleDropzoneDragOver}
                  onDragLeave={handleDropzoneDragLeave}
                  onDrop={handleDropzoneDrop}
                  className={[
                    "border-2 border-dashed rounded-lg p-4 text-xs flex flex-col items-center justify-center gap-2",
                    dragActive ? "border-slate-600 bg-slate-100" : "border-slate-300 bg-slate-50",
                  ].join(" ")}
                >
                  <p className="font-medium text-slate-700 text-center">JSON dosyasını sürükle bırak veya seç</p>
                  <p className="text-[11px] text-slate-500 text-center">
                    Format: [&#123; employee: &#123; ... &#125;, payroll: &#123; ... &#125; &#125;]
                  </p>

                  <div className="mt-1 flex flex-wrap gap-2 justify-center">
                    <label className="inline-flex items-center px-3 py-1.5 rounded border border-slate-300 text-[11px] font-medium cursor-pointer hover:bg-slate-100">
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
                      onClick={handleDownloadSampleCompanyJson}
                      className="inline-flex items-center px-3 py-1.5 rounded border border-slate-300 text-[11px] font-medium hover:bg-slate-100 disabled:opacity-60"
                      disabled={bulkLoading}
                    >
                      Örnek JSON indir
                    </button>
                  </div>
                </div>

                {bulkProgress ? (
                  <div className="w-full">
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${(bulkProgress.processed / bulkProgress.total) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {bulkProgress.processed} / {bulkProgress.total} kayıt işlendi
                    </p>
                  </div>
                ) : null}

                {bulkError ? <p className="text-[11px] text-red-600">{bulkError}</p> : null}

                {bulkStats && !bulkLoading ? (
                  <div className="text-[11px] space-y-1">
                    <p className="text-emerald-600">
                      Toplam {bulkStats.total} kaydın {bulkStats.imported} tanesi eklendi, {bulkStats.failed} tanesi hatalı.
                    </p>
                    {bulkStats.payrollGroupId ? <p className="text-slate-500">Group ID: {bulkStats.payrollGroupId}</p> : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

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
