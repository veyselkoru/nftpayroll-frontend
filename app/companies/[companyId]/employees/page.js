"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Building2, Coins, Plus, Users, Wallet, WalletCards, X } from "lucide-react";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import DataTable from "@/app/components/DataTable";
import Select2 from "@/app/components/Select2";
import { fetchEmployees, createEmployeeApi } from "@/lib/employees";
import { fetchCompanies, fetchCompanyDetail } from "@/lib/companies";
import DatePicker from "@/app/components/DatePicker";
import { formatDateDDMMYYYY } from "@/lib/date";

function initialForm() {
  return {
    employee_code: "",
    name: "",
    surname: "",
    tc_no: "",
    position: "",
    department: "",
    start_date: "",
    wallet_address: "",
  };
}

function extractCreatedEmployee(payload) {
  const candidate = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(candidate)) return candidate[0] ?? null;
  if (candidate && typeof candidate === "object" && (candidate.id || candidate.name)) return candidate;
  return null;
}

function maskTc(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "-";
  if (digits.length <= 5) return `${digits.slice(0, 1)}***${digits.slice(-1)}`;
  return `${digits.slice(0, 3)}*****${digits.slice(-2)}`;
}

export default function EmployeesPage() {
  const ready = useAuthGuard();
  const { companyId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const allMode = searchParams.get("company") === "all";

  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyName, setCompanyName] = useState("");
  const [form, setForm] = useState(initialForm());
  const [filters, setFilters] = useState({
    companyId: allMode ? "all" : String(companyId),
    employeeId: "all",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    setFilters((prev) => ({
      ...prev,
      companyId: allMode ? "all" : String(companyId),
      employeeId: "all",
    }));
  }, [companyId, allMode]);

  useEffect(() => {
    if (!companyId) return;

    setLoading(true);
    Promise.all([fetchCompanyDetail(companyId).catch(() => null), fetchCompanies().catch(() => [])])
      .then(async ([companyData, companiesData]) => {
        const companyList = Array.isArray(companiesData) ? companiesData : companiesData?.data || [];
        setCompanies(companyList);
        setCompanyName(companyData?.name || "");

        const employeeResponses = await Promise.all(
          companyList.map(async (company) => {
            try {
              const employeesResp = await fetchEmployees(company.id);
              const list = Array.isArray(employeesResp) ? employeesResp : employeesResp.data || [];
              return list.map((employee) => ({ ...employee, companyId: company.id, companyName: company.name }));
            } catch {
              return [];
            }
          })
        );

        const normalizedAll = employeeResponses.flat();
        setAllEmployees(normalizedAll);
        setEmployees(normalizedAll.filter((employee) => String(employee.companyId) === String(companyId)));
      })
      .catch((err) => {
        setError(err.message || "Çalışanlar alınamadı.");
        if (String(err.message || "").toLowerCase().includes("unauth")) {
          router.push("/login");
        }
      })
      .finally(() => setLoading(false));
  }, [companyId, router]);

  const companyOptions = useMemo(() => {
    const unique = new Map();
    (companies || []).forEach((company) => {
      const key = String(company.id);
      if (!unique.has(key)) {
        unique.set(key, {
          value: key,
          label: company.name || `Firma #${company.id}`,
        });
      }
    });
    return [{ value: "all", label: "Tüm Firmalar" }, ...Array.from(unique.values())];
  }, [companies]);

  const employeeOptions = useMemo(() => {
    const unique = new Map();
    const source =
      filters.companyId === "all"
        ? allEmployees
        : allEmployees.filter((employee) => String(employee.companyId) === String(filters.companyId));

    source.forEach((employee) => {
      const key = String(employee.id);
      if (!unique.has(key)) {
        unique.set(key, {
          value: `${employee.companyId}:${key}`,
          label:
            `${[employee.name, employee.surname].filter(Boolean).join(" ") || `Çalışan #${employee.id}`}` +
            (filters.companyId === "all" ? ` (${employee.companyName || `Firma #${employee.companyId}`})` : ""),
        });
      }
    });
    return [{ value: "all", label: "Tüm Çalışanlar" }, ...Array.from(unique.values())];
  }, [allEmployees, filters.companyId]);

  const filteredEmployees = useMemo(() => {
    const source =
      filters.companyId === "all"
        ? allEmployees
        : allEmployees.filter((employee) => String(employee.companyId) === String(filters.companyId));
    if (filters.employeeId === "all") return source;
    const [employeeCompanyId, employeeId] = String(filters.employeeId).split(":");
    return source.filter(
      (employee) =>
        String(employee.id) === String(employeeId || filters.employeeId) &&
        (filters.companyId !== "all" || String(employee.companyId) === String(employeeCompanyId))
    );
  }, [allEmployees, filters.companyId, filters.employeeId]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === "companyId") {
      if (value === "all") {
        router.push(`/companies/${companyId}/employees?company=all`);
        return;
      }
      router.push(`/companies/${value}/employees`);
      return;
    }
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "tc_no") {
      const digits = value.replace(/\D/g, "").slice(0, 11);
      setForm((prev) => ({ ...prev, [name]: digits }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setCreating(true);
    setError("");
    try {
      const payload = {
        employee_code: form.employee_code || null,
        name: form.name || null,
        surname: form.surname || null,
        tc_no: form.tc_no || null,
        national_id: form.tc_no || null,
        position: form.position || null,
        department: form.department || null,
        start_date: form.start_date || null,
        wallet_address: form.wallet_address || null,
      };

      const created = await createEmployeeApi(companyId, payload);
      const item = extractCreatedEmployee(created);
      if (!item) throw new Error("Çalışan oluşturuldu ancak dönen veri geçersiz.");

      setEmployees((prev) => {
        const withoutDuplicate = prev.filter((emp) => emp.id !== item.id);
        return [item, ...withoutDuplicate];
      });

      setForm(initialForm());
      setCreateModalOpen(false);
    } catch (err) {
      setError(err.message || "Kayıt sırasında bir hata oluştu.");
    } finally {
      setCreating(false);
    }
  };

  const cards = useMemo(() => {
    const source = filteredEmployees;
    const walletCount = source.filter((e) => e.wallet_address || e.wallet).length;
    const departmentCount = new Set(source.map((e) => e.department).filter(Boolean)).size;
    const tcCount = source.filter((e) => String(e.tc_no || e.national_id || "").replace(/\D/g, "").length >= 11).length;

    return [
      {
        title: "Toplam Çalışan",
        value: source.length,
        desc: filters.companyId === "all" ? "Tüm firmalerde kayıtlı" : "Bu firmate kayıtlı",
        icon: Users,
        onClick: () => {},
      },
      {
        title: "Wallet Tanımlı",
        value: walletCount,
        desc: "Mint için hazır",
        icon: Wallet,
        onClick: () => {},
      },
      {
        title: "Departman",
        value: departmentCount,
        desc: "Aktif departman sayısı",
        icon: Building2,
        onClick: () => {},
      },
      {
        title: "TC Tanımlı",
        value: tcCount,
        desc: "Kimlik bilgisi bulunan çalışan",
        icon: Coins,
        onClick: () => {},
      },
    ];
  }, [filteredEmployees, filters.companyId]);

  const columns = [
    {
      key: "id",
      header: "ID",
      render: (_row, _rowIndex, serial) => <span className="text-xs text-slate-500">{serial}</span>,
    },
    {
      key: "full_name",
      header: "Ad Soyad",
      accessor: (row) => [row.name, row.surname].filter(Boolean).join(" "),
      render: (row) => {
        const full = [row.name, row.surname].filter(Boolean).join(" ") || "-";
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/companies/${row.companyId || companyId}/employees/${row.id}/payrolls`);
            }}
            className="block max-w-[220px] truncate font-medium text-left hover:underline"
            title={full}
          >
            {full}
          </button>
        );
      },
    },
    {
      key: "employee_code",
      header: "Kod",
      render: (row) => <span className="text-xs">{row.employee_code || "-"}</span>,
    },
    {
      key: "tc_no",
      header: "TC",
      accessor: (row) => row.tc_no || row.national_id,
      render: (row) => <span className="text-xs">{maskTc(row.tc_no || row.national_id)}</span>,
    },
    {
      key: "position",
      header: "Ünvan",
      render: (row) => <span className="text-xs">{row.position || "-"}</span>,
    },
    {
      key: "department",
      header: "Departman",
      render: (row) => <span className="text-xs">{row.department || "-"}</span>,
    },
    {
      key: "start_date",
      header: "İşe Başlama",
      render: (row) => <span className="text-xs">{formatDateDDMMYYYY(row.start_date)}</span>,
    },
    {
      key: "actions",
      header: "Aksiyon",
      sortable: false,
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            title="NFT & Mint"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/companies/${row.companyId || companyId}/employees/${row.id}/nfts`);
            }}
            className="inline-flex items-center justify-center text-xs border border-amber-200 bg-amber-50 text-amber-700 rounded p-1.5 hover:bg-amber-100"
          >
            <Coins className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Bordrolar"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/companies/${row.companyId || companyId}/employees/${row.id}/payrolls`);
            }}
            className="inline-flex items-center justify-center text-xs border border-violet-200 bg-violet-50 text-violet-700 rounded p-1.5 hover:bg-violet-100"
          >
            <WalletCards className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

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
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Firma #{companyId} / Çalışanlar</p>
              <h1 className="text-2xl font-bold">Çalışanlar</h1>
              <p className="text-xs text-slate-500 mt-1">
                {filters.companyId === "all" ? "Tüm Firmalar" : companyName || `Firma #${companyId}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/companies/${companyId}`)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Firma Ekranı
              </button>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#111b3a] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d1630] transition"
              >
                <Plus className="w-4 h-4" />
                Yeni Çalışan Ekle
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          <section className="ta-card p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Firma Filtresi</label>
                <Select2
                  name="companyId"
                  value={filters.companyId}
                  onChange={handleFilterChange}
                  options={companyOptions}
                  isSearchable
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Çalışan Filtresi</label>
                <Select2
                  name="employeeId"
                  value={filters.employeeId}
                  onChange={handleFilterChange}
                  options={employeeOptions}
                  isSearchable
                />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={`${card.title}-${String(card.value)}-top`}
                  type="button"
                  onClick={card.onClick}
                  className="ta-card p-4 text-left hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500">{card.title}</div>
                      <div className="mt-2 text-2xl font-bold text-slate-900">{card.value}</div>
                      <div className="mt-1 text-[11px] text-slate-500">{card.desc}</div>
                    </div>
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-700">
                      <Icon className="w-4 h-4" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="ta-card p-6 text-sm text-slate-500">Yükleniyor...</div>
          ) : (
            <DataTable
              columns={columns}
              rows={filteredEmployees}
              rowKey={(row) => `${row.companyId || companyId}-${row.id}-${row.tc_no || row.national_id || ""}`}
              onRowClick={(row) => router.push(`/companies/${row.companyId || companyId}/employees/${row.id}/payrolls`)}
              emptyText="Çalışan kaydı bulunamadı."
              defaultPageSize={10}
              enableSearch
              searchPlaceholder="ID, ad soyad, kod, TC, ünvan, departman ara..."
              searchableKeys={[
                "id",
                "name",
                "surname",
                "employee_code",
                "tc_no",
                "national_id",
                "position",
                "department",
                "wallet_address",
                "wallet",
              ]}
            />
          )}
        </main>
      </div>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => {
              if (!creating) setCreateModalOpen(false);
            }}
          />

          <div className="relative w-full max-w-3xl ta-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Yeni Çalışan Ekle</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {companyName || `Firma #${companyId}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!creating) setCreateModalOpen(false);
                }}
                className="rounded-md p-1 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <label className="text-slate-600">Çalışan Kodu</label>
                  <input
                    name="employee_code"
                    value={form.employee_code}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="EMP-001"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600">TC Kimlik No</label>
                  <input
                    type="text"
                    name="tc_no"
                    value={form.tc_no}
                    onChange={handleChange}
                    maxLength={11}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="11 hane"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <label className="text-slate-600">Ad</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Ahmet"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600">Soyad</label>
                  <input
                    name="surname"
                    value={form.surname}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Yılmaz"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <label className="text-slate-600">Pozisyon</label>
                  <input
                    name="position"
                    value={form.position}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Yazılım Geliştirici"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600">Departman</label>
                  <input
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="AR-GE"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <label className="text-slate-600">İşe Başlama Tarihi</label>
                  <DatePicker
                    name="start_date"
                    value={form.start_date}
                    onChange={handleChange}
                    placeholder="Tarih seçin"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600">Wallet Adresi (opsiyonel)</label>
                  <input
                    name="wallet_address"
                    value={form.wallet_address}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="0x..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50"
                  onClick={() => {
                    if (!creating) setCreateModalOpen(false);
                  }}
                  disabled={creating}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                  disabled={creating}
                >
                  {creating ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
