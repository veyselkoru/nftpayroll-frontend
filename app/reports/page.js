"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import DataTable from "@/app/components/DataTable";
import Select2 from "@/app/components/Select2";
import DatePicker from "@/app/components/DatePicker";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import { fetchCompanies } from "@/lib/companies";
import { fetchEmployees } from "@/lib/employees";
import { fetchPayrolls } from "@/lib/payrolls";
import { meApi } from "@/lib/auth";
import { extractUserContext, isAdminLike, isEmployeeLike, isManagerLike } from "@/lib/user";
import { formatDateDDMMYYYY } from "@/lib/date";
import { formatCurrencyTrailing } from "@/lib/currency";

function toList(response) {
  return Array.isArray(response) ? response : response?.data || [];
}

function toAmount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function fmtAmount(value, currency = "TRY") {
  return formatCurrencyTrailing(value, currency || "TRY");
}

function fmtDate(dateStr) {
  return formatDateDDMMYYYY(dateStr);
}

function withinDateRange(dateText, from, to) {
  if (!from && !to) return true;
  if (!dateText) return false;
  const current = new Date(dateText);
  if (Number.isNaN(current.getTime())) return false;

  if (from) {
    const start = new Date(`${from}T00:00:00`);
    if (current < start) return false;
  }
  if (to) {
    const end = new Date(`${to}T23:59:59`);
    if (current > end) return false;
  }
  return true;
}

function resolveInitialType(view) {
  if (view === "company") return "company-summary";
  if (view === "employee") return "employee-summary";
  if (view === "nft") return "mint-status";
  if (view === "payroll") return "payroll";
  return "payroll";
}

function ReportsPageContent() {
  const ready = useAuthGuard();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [userContext, setUserContext] = useState({
    id: null,
    email: null,
    role: "",
    companyId: null,
    employeeId: null,
  });

  const [reportType, setReportType] = useState(resolveInitialType(searchParams.get("view")));
  const [filters, setFilters] = useState({
    companyId: "all",
    employeeId: "all",
    status: "all",
    currency: "all",
    dateFrom: "",
    dateTo: "",
    search: "",
  });

  useEffect(() => {
    const view = searchParams.get("view");
    setReportType(resolveInitialType(view));
  }, [searchParams]);

  useEffect(() => {
    if (!ready) return;

    let canceled = false;

    const load = async () => {
      try {
        const me = await meApi().catch(() => null);
        const context = extractUserContext(me);
        if (!canceled) {
          setUserContext(context);
          setIsAdmin(isAdminLike(me));
          setIsManager(isManagerLike(me));
          setIsEmployee(isEmployeeLike(me));
        }

        const companyResp = await fetchCompanies();
        const companyList = toList(companyResp);
        if (canceled) return;

        setCompanies(companyList);

        const employeeRespList = await Promise.all(
          companyList.map(async (company) => {
            try {
              const employeeResp = await fetchEmployees(company.id);
              const employees = toList(employeeResp);
              return { company, employees };
            } catch {
              return { company, employees: [] };
            }
          })
        );
        if (canceled) return;

        const payrollRequests = [];
        employeeRespList.forEach(({ company, employees }) => {
          employees.forEach((employee) => {
            payrollRequests.push(
              fetchPayrolls(company.id, employee.id)
                .then((payrollResp) => ({
                  company,
                  employee,
                  payrolls: toList(payrollResp),
                }))
                .catch(() => ({
                  company,
                  employee,
                  payrolls: [],
                }))
            );
          });
        });

        const payrollResults = await Promise.all(payrollRequests);
        if (canceled) return;

        const normalizedRows = payrollResults.flatMap(({ company, employee, payrolls }) =>
          payrolls.map((payroll) => ({
            id: payroll.id,
            key: `${company.id}-${employee.id}-${payroll.id}`,
            companyId: company.id,
            companyName: company.name || `Firma #${company.id}`,
            employeeId: employee.id,
            employeeName:
              [employee.name, employee.surname].filter(Boolean).join(" ") || `Çalışan #${employee.id}`,
            employeeEmail: employee.email || null,
            employeeUserId: employee.user_id || employee.userId || employee.auth_user_id || null,
            payrollGroupId: payroll.payroll_group_id || "",
            periodStart: payroll.period_start || "",
            periodEnd: payroll.period_end || "",
            paymentDate: payroll.payment_date || "",
            currency: payroll.currency || "TRY",
            grossSalary: toAmount(payroll.gross_salary),
            netSalary: toAmount(payroll.net_salary),
            bonus: toAmount(payroll.bonus),
            deductionsTotal: toAmount(payroll.deductions_total),
            status: payroll.nft?.status || payroll.status || "unknown",
            txHash: payroll.nft?.tx_hash || payroll.tx_hash || "",
            payrollPath: `/companies/${company.id}/employees/${employee.id}/payrolls/${payroll.id}`,
          }))
        );

        setRows(normalizedRows);
      } catch (err) {
        setError(err.message || "Rapor verileri yüklenemedi.");
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    load();

    return () => {
      canceled = true;
    };
  }, [ready]);

  const statusOptions = useMemo(() => {
    const set = new Set(rows.map((row) => row.status).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"));
  }, [rows]);

  const currencyOptions = useMemo(() => {
    const set = new Set(rows.map((row) => row.currency).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"));
  }, [rows]);

  const companySelectOptions = useMemo(
    () => [
      { value: "all", label: "Tümü" },
      ...companies.map((company) => ({
        value: String(company.id),
        label: company.name || `Firma #${company.id}`,
      })),
    ],
    [companies]
  );

  const resolvedEmployeeId = useMemo(() => {
    if (userContext.employeeId != null) return String(userContext.employeeId);
    if (userContext.id != null) {
      const byUser = rows.find((row) => row.employeeUserId != null && String(row.employeeUserId) === String(userContext.id));
      if (byUser) return String(byUser.employeeId);
    }
    if (userContext.email) {
      const byEmail = rows.find(
        (row) =>
          row.employeeEmail &&
          String(row.employeeEmail).toLowerCase() === String(userContext.email).toLowerCase()
      );
      if (byEmail) return String(byEmail.employeeId);
    }
    return null;
  }, [rows, userContext.email, userContext.employeeId, userContext.id]);

  const scopedRows = useMemo(() => {
    if (!isEmployee) return rows;
    if (!resolvedEmployeeId) return [];
    return rows.filter((row) => String(row.employeeId) === String(resolvedEmployeeId));
  }, [isEmployee, resolvedEmployeeId, rows]);

  const employeeSelectOptions = useMemo(() => {
    const map = new Map();
    scopedRows.forEach((row) => {
      if (filters.companyId !== "all" && String(row.companyId) !== filters.companyId) return;
      const key = `${row.companyId}-${row.employeeId}`;
      if (!map.has(key)) {
        map.set(key, {
          value: String(row.employeeId),
          label: `${row.employeeName} (${row.companyName})`,
        });
      }
    });
    return [{ value: "all", label: "Tümü" }, ...Array.from(map.values())];
  }, [scopedRows, filters.companyId]);

  const statusSelectOptions = useMemo(
    () => [
      { value: "all", label: "Tümü" },
      ...statusOptions.map((status) => ({ value: status, label: status })),
    ],
    [statusOptions]
  );

  const currencySelectOptions = useMemo(
    () => [
      { value: "all", label: "Tümü" },
      ...currencyOptions.map((currency) => ({ value: currency, label: currency })),
    ],
    [currencyOptions]
  );

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => {
      if (name === "companyId") return { ...prev, companyId: value, employeeId: "all" };
      return { ...prev, [name]: value };
    });
  };

  const filteredRows = useMemo(() => {
    return scopedRows.filter((row) => {
      if (filters.companyId !== "all" && String(row.companyId) !== filters.companyId) return false;
      if (!isEmployee && filters.employeeId !== "all" && String(row.employeeId) !== filters.employeeId) return false;
      if (filters.status !== "all" && row.status !== filters.status) return false;
      if (filters.currency !== "all" && row.currency !== filters.currency) return false;

      const filterDate = row.paymentDate || row.periodEnd || row.periodStart;
      if (!withinDateRange(filterDate, filters.dateFrom, filters.dateTo)) return false;

      if (filters.search.trim()) {
        const query = filters.search.toLowerCase();
        const stack = [
          row.companyName,
          row.employeeName,
          row.txHash,
          row.status,
          row.id ? String(row.id) : "",
          row.payrollGroupId ? String(row.payrollGroupId) : "",
        ]
          .join(" ")
          .toLowerCase();
        if (!stack.includes(query)) return false;
      }

      return true;
    });
  }, [filters, isEmployee, scopedRows]);

  useEffect(() => {
    if (!isEmployee) return;
    if (!resolvedEmployeeId) return;
    setFilters((prev) => ({ ...prev, employeeId: String(resolvedEmployeeId) }));
  }, [isEmployee, resolvedEmployeeId]);

  const employeeSummaryRows = useMemo(() => {
    const map = new Map();

    filteredRows.forEach((row) => {
      const key = `${row.companyId}-${row.employeeId}`;
      const existing = map.get(key) || {
        key,
        companyName: row.companyName,
        employeeName: row.employeeName,
        payrollCount: 0,
        totalGross: 0,
        totalNet: 0,
        totalBonus: 0,
        totalDeduction: 0,
        sentCount: 0,
        failedCount: 0,
        lastPaymentDate: "",
      };

      existing.payrollCount += 1;
      existing.totalGross += row.grossSalary;
      existing.totalNet += row.netSalary;
      existing.totalBonus += row.bonus;
      existing.totalDeduction += row.deductionsTotal;
      if (row.status === "sent") existing.sentCount += 1;
      if (row.status === "failed") existing.failedCount += 1;
      if (row.paymentDate && row.paymentDate > existing.lastPaymentDate) existing.lastPaymentDate = row.paymentDate;

      map.set(key, existing);
    });

    return Array.from(map.values());
  }, [filteredRows]);

  const companySummaryRows = useMemo(() => {
    const map = new Map();

    filteredRows.forEach((row) => {
      const key = String(row.companyId);
      const existing = map.get(key) || {
        key,
        companyName: row.companyName,
        employeeCount: 0,
        payrollCount: 0,
        sentCount: 0,
        failedCount: 0,
        totalNet: 0,
        totalGross: 0,
      };

      existing.payrollCount += 1;
      existing.totalNet += row.netSalary;
      existing.totalGross += row.grossSalary;
      if (row.status === "sent") existing.sentCount += 1;
      if (row.status === "failed") existing.failedCount += 1;

      map.set(key, existing);
    });

    const list = Array.from(map.values());
    return list.map((item) => {
      const employeeKeys = new Set(
        filteredRows
          .filter((row) => String(row.companyId) === item.key)
          .map((row) => `${row.companyId}-${row.employeeId}`)
      );
      return { ...item, employeeCount: employeeKeys.size };
    });
  }, [filteredRows]);

  const kpis = useMemo(() => {
    const totalGross = filteredRows.reduce((sum, row) => sum + row.grossSalary, 0);
    const totalNet = filteredRows.reduce((sum, row) => sum + row.netSalary, 0);
    const sentCount = filteredRows.filter((row) => row.status === "sent").length;
    const failedCount = filteredRows.filter((row) => row.status === "failed").length;

    return {
      payrollCount: filteredRows.length,
      totalGross,
      totalNet,
      sentCount,
      failedCount,
    };
  }, [filteredRows]);

  const payrollColumns = [
    {
      key: "id",
      header: "Payroll ID",
      render: (row) => <span className="text-xs text-slate-500">#{row.id}</span>,
    },
    { key: "companyName", header: "Firma" },
    { key: "employeeName", header: "Çalışan" },
    {
      key: "periodEnd",
      header: "Dönem",
      render: (row) => `${fmtDate(row.periodStart)} - ${fmtDate(row.periodEnd)}`,
      sortValue: (row) => row.periodEnd || row.periodStart || "",
    },
    {
      key: "paymentDate",
      header: "Ödeme Tarihi",
      render: (row) => fmtDate(row.paymentDate),
    },
    {
      key: "netSalary",
      header: "Net Maaş",
      render: (row) => fmtAmount(row.netSalary, row.currency),
      className: "whitespace-nowrap",
    },
    {
      key: "status",
      header: "Mint Durumu",
      render: (row) => (
        <span
          className={[
            "inline-flex rounded-full px-2 py-1 text-[11px] capitalize",
            row.status === "sent"
              ? "bg-green-100 text-green-700"
              : row.status === "failed"
                ? "bg-red-100 text-red-700"
                : "bg-slate-100 text-slate-700",
          ].join(" ")}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "action",
      header: "Detay",
      sortable: false,
      render: (row) => (
        <button
          type="button"
          onClick={() => router.push(row.payrollPath)}
          className="text-xs border px-2 py-1 rounded hover:bg-slate-50"
        >
          Aç
        </button>
      ),
    },
  ];

  const mintColumns = [
    { key: "id", header: "Payroll ID", render: (row) => <span>#{row.id}</span> },
    { key: "companyName", header: "Firma" },
    { key: "employeeName", header: "Çalışan" },
    {
      key: "status",
      header: "NFT Durumu",
      render: (row) => (
        <span className="inline-flex rounded-full bg-slate-100 text-slate-700 px-2 py-1 text-[11px] capitalize">
          {row.status}
        </span>
      ),
    },
    {
      key: "txHash",
      header: "Tx Hash",
      render: (row) =>
        row.txHash ? (
          <span className="font-mono text-xs">{row.txHash.slice(0, 18)}...</span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
    {
      key: "paymentDate",
      header: "Tarih",
      render: (row) => fmtDate(row.paymentDate || row.periodEnd),
    },
  ];

  const employeeSummaryColumns = [
    { key: "companyName", header: "Firma" },
    { key: "employeeName", header: "Çalışan" },
    { key: "payrollCount", header: "Payroll Sayısı" },
    {
      key: "totalGross",
      header: "Toplam Brüt",
      render: (row) => fmtAmount(row.totalGross, "TRY"),
    },
    {
      key: "totalNet",
      header: "Toplam Net",
      render: (row) => fmtAmount(row.totalNet, "TRY"),
    },
    {
      key: "sentCount",
      header: "Sent",
    },
    {
      key: "failedCount",
      header: "Failed",
    },
    {
      key: "lastPaymentDate",
      header: "Son Ödeme",
      render: (row) => fmtDate(row.lastPaymentDate),
    },
  ];

  const companySummaryColumns = [
    { key: "companyName", header: "Firma" },
    { key: "employeeCount", header: "Çalışan Sayısı" },
    { key: "payrollCount", header: "Payroll Sayısı" },
    { key: "sentCount", header: "Sent" },
    { key: "failedCount", header: "Failed" },
    {
      key: "totalGross",
      header: "Toplam Brüt",
      render: (row) => fmtAmount(row.totalGross, "TRY"),
    },
    {
      key: "totalNet",
      header: "Toplam Net",
      render: (row) => fmtAmount(row.totalNet, "TRY"),
    },
  ];

  const tableRows =
    reportType === "employee-summary"
      ? employeeSummaryRows
      : reportType === "company-summary"
        ? companySummaryRows
        : filteredRows;

  const tableColumns =
    reportType === "mint-status"
      ? mintColumns
      : reportType === "employee-summary"
        ? employeeSummaryColumns
        : reportType === "company-summary"
          ? companySummaryColumns
          : payrollColumns;

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
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar />

        <main className="ta-page space-y-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Raporlar</h1>
            <p className="text-sm text-slate-500">NFT & Mint raporları: firma ve çalışan bazlı görünüm.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="ta-card p-3">
              <div className="text-xs text-slate-500">Toplam Payroll</div>
              <div className="text-xl font-semibold mt-1">{kpis.payrollCount}</div>
            </div>
            <div className="ta-card p-3">
              <div className="text-xs text-slate-500">Toplam Brüt</div>
              <div className="text-xl font-semibold mt-1">{fmtAmount(kpis.totalGross, "TRY")}</div>
            </div>
            <div className="ta-card p-3">
              <div className="text-xs text-slate-500">Toplam Net</div>
              <div className="text-xl font-semibold mt-1">{fmtAmount(kpis.totalNet, "TRY")}</div>
            </div>
            <div className="ta-card p-3">
              <div className="text-xs text-slate-500">Sent</div>
              <div className="text-xl font-semibold mt-1">{kpis.sentCount}</div>
            </div>
            <div className="ta-card p-3">
              <div className="text-xs text-slate-500">Failed</div>
              <div className="text-xl font-semibold mt-1">{kpis.failedCount}</div>
            </div>
          </div>

          <section className="ta-card p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
              {isAdmin ? (
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Firma</label>
                  <Select2
                    name="companyId"
                    value={filters.companyId}
                    onChange={handleFilterChange}
                    options={companySelectOptions}
                    isSearchable
                  />
                </div>
              ) : null}

              {isAdmin || isManager ? (
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Çalışan</label>
                  <Select2
                    name="employeeId"
                    value={filters.employeeId}
                    onChange={handleFilterChange}
                    options={employeeSelectOptions}
                    isSearchable
                  />
                </div>
              ) : null}

              <div>
                <label className="block text-xs text-slate-600 mb-1">Durum</label>
                <Select2
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  options={statusSelectOptions}
                  isSearchable
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Para Birimi</label>
                <Select2
                  name="currency"
                  value={filters.currency}
                  onChange={handleFilterChange}
                  options={currencySelectOptions}
                  isSearchable
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Başlangıç</label>
                <DatePicker
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                  placeholder="Başlangıç tarihi"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Bitiş</label>
                <DatePicker
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                  placeholder="Bitiş tarihi"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Arama</label>
                <input
                  type="text"
                  placeholder="Firma, çalışan, tx, ID..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="w-full border rounded px-2 py-2 text-sm bg-white"
                />
              </div>
            </div>
            {isEmployee ? (
              <p className="text-[11px] text-slate-500">
                Çalışan rolü: yalnızca kendi NFT & Mint raporların gösterilir.
              </p>
            ) : null}
          </section>

          {error ? (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded">{error}</div>
          ) : null}

          {loading ? (
            <div className="ta-card p-6 text-sm text-slate-500">Rapor verileri yükleniyor...</div>
          ) : (
            <DataTable
              columns={tableColumns}
              rows={tableRows}
              rowKey={(row) => row.key || row.id}
              emptyText="Filtreye uygun kayıt bulunamadı."
              defaultPageSize={20}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
          Yükleniyor...
        </div>
      }
    >
      <ReportsPageContent />
    </Suspense>
  );
}
