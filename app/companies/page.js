"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Plus, Users, X } from "lucide-react";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import Select2 from "@/app/components/Select2";
import DataTable from "@/app/components/DataTable";
import { fetchCompanies, createCompanyApi } from "@/lib/companies";

const companyTypeOptions = [
  { value: "", label: "Seçiniz" },
  { value: "Sole Proprietorship", label: "Şahıs" },
  { value: "Limited", label: "Limited (LTD)" },
  { value: "Joint-Stock", label: "Anonim (A.Ş.)" },
];

const typeLabelMap = {
  "Sole Proprietorship": "Şahıs",
  Limited: "Limited (LTD)",
  "Joint-Stock": "Anonim (A.Ş.)",
};

function extractCompaniesList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.companies)) return payload.companies;
  return [];
}

function extractCreatedCompany(payload) {
  const candidate = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(candidate)) return candidate[0] ?? null;
  if (candidate && typeof candidate === "object" && (candidate.id || candidate.name)) {
    return candidate;
  }
  return null;
}

function initialForm() {
  return {
    name: "",
    type: "",
    tax_number: "",
    registration_number: "",
    country: "",
    city: "",
    address: "",
    contact_phone: "",
    contact_email: "",
  };
}

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCompanies()
      .then((data) => setCompanies(extractCompaniesList(data)))
      .catch((err) => {
        setError(err.message || "Firmalar alınamadı.");
        if (String(err.message || "").toLowerCase().includes("unauth")) {
          router.push("/login");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const formatPhoneTR = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (!digits) return "";
    let result = "";
    for (let i = 0; i < digits.length; i += 1) {
      if (i === 1 || i === 4 || i === 7 || i === 9) result += " ";
      result += digits[i];
    }
    return result;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "tax_number") {
      setForm((prev) => ({ ...prev, [name]: value.replace(/\D/g, "").slice(0, 10) }));
      return;
    }
    if (name === "contact_phone") {
      setForm((prev) => ({ ...prev, [name]: formatPhoneTR(value) }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setCreating(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        type: form.type || null,
        tax_number: form.tax_number || null,
        registration_number: form.registration_number || null,
        country: form.country || null,
        city: form.city || null,
        address: form.address || null,
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
      };

      const created = await createCompanyApi(payload);
      const createdItem = extractCreatedCompany(created);
      if (!createdItem) throw new Error("Firma oluşturuldu ancak dönen veri geçersiz.");

      setCompanies((prev) => {
        const withoutDuplicate = prev.filter((item) => item.id !== createdItem.id);
        return [createdItem, ...withoutDuplicate];
      });

      setForm(initialForm());
      setCreateModalOpen(false);
    } catch (err) {
      setError(err.message || "Firma oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  };

  const tableColumns = [
    {
      key: "id",
      header: "ID",
      render: (_row, _rowIndex, serial) => <span className="text-xs text-slate-500">{serial}</span>,
    },
    {
      key: "name",
      header: "Firma Adı",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/companies/${row.id}`);
          }}
          className="block max-w-[230px] truncate font-medium text-left hover:underline"
          title={row.name}
        >
          {row.name}
        </button>
      ),
    },
    {
      key: "type",
      header: "Tür",
      render: (row) =>
        row.type ? (
          <span className="inline-flex rounded-full px-2 py-0.5 bg-slate-100 text-slate-700 text-xs">
            {typeLabelMap[row.type] || row.type}
          </span>
        ) : (
          <span className="text-slate-400 text-xs">-</span>
        ),
    },
    {
      key: "city",
      header: "Lokasyon",
      accessor: (row) => [row.city, row.country].filter(Boolean).join(" / "),
      render: (row) => (
        <span className="text-xs text-slate-600">
          {[row.city, row.country].filter(Boolean).join(" / ") || "-"}
        </span>
      ),
    },
    {
      key: "contact",
      header: "İletişim",
      sortable: false,
      render: (row) => (
        <span className="text-xs text-slate-600">{row.contact_email || row.contact_phone || "-"}</span>
      ),
    },
    {
      key: "actions",
      header: "Aksiyon",
      sortable: false,
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            title="Çalışanlar"
            className="inline-flex items-center justify-center text-xs border border-blue-200 bg-blue-50 text-blue-700 rounded p-1.5 hover:bg-blue-100"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/companies/${row.id}/employees`);
            }}
          >
            <Users className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Bordro Sayfası"
            className="inline-flex items-center justify-center text-xs border border-emerald-200 bg-emerald-50 text-emerald-700 rounded p-1.5 hover:bg-emerald-100"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/companies/payrolls?companyId=${row.id}`);
            }}
          >
            <Coins className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex ta-shell">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <Navbar />

        <main className="ta-page space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Firmalar</h1>
              <p className="text-sm text-slate-500">Data table görünümünde firma yönetimi.</p>
            </div>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#111b3a] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d1630] transition"
            >
              <Plus className="w-4 h-4" />
              Yeni Firma Ekle
            </button>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="ta-card p-6 text-sm text-slate-500">Yükleniyor...</div>
          ) : (
            <DataTable
              columns={tableColumns}
              rows={companies}
              rowKey="id"
              onRowClick={(row) => router.push(`/companies/${row.id}`)}
              emptyText="Filtreye uygun firma bulunamadı."
              defaultPageSize={10}
              enableSearch
              searchPlaceholder="ID, isim, vergi no, şehir, iletişim bilgisi ara..."
              searchableKeys={[
                "id",
                "name",
                "type",
                "tax_number",
                "registration_number",
                "city",
                "country",
                "contact_email",
                "contact_phone",
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
          <div className="relative w-full max-w-2xl ta-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Yeni Firma Ekle</h2>
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

            <form className="space-y-3" onSubmit={handleCreateCompany}>
              <div className="space-y-1 text-sm">
                <label className="text-slate-600">Firma Adı</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Örn: Acme A.Ş."
                />
              </div>

              <div className="space-y-1 text-sm">
                <label className="text-slate-600">Firma Türü</label>
                <Select2
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  options={companyTypeOptions}
                  placeholder="Seçiniz"
                  isClearable
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <label className="text-slate-600">Vergi No</label>
                  <input
                    name="tax_number"
                    value={form.tax_number}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Vergi No"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600">Ticaret Sicil No</label>
                  <input
                    name="registration_number"
                    value={form.registration_number}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Ticaret Sicil No"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <label className="text-slate-600">Ülke</label>
                  <input
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Örn: Türkiye"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600">Şehir</label>
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Örn: İstanbul"
                  />
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <label className="text-slate-600">Adres</label>
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Kısa adres"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <label className="text-slate-600">İrtibat Telefonu</label>
                  <input
                    type="tel"
                    name="contact_phone"
                    value={form.contact_phone}
                    onChange={handleChange}
                    placeholder="0 555 555 55 55"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600">İletişim E-posta</label>
                  <input
                    type="email"
                    name="contact_email"
                    value={form.contact_email}
                    onChange={handleChange}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="info@firma.com"
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
