"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthGuard } from "@/app/components/layout/useAuthGuard";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { fetchEmployees, createEmployeeApi } from "@/lib/employees";

export default function EmployeesPage() {
    const ready = useAuthGuard();
    const { companyId } = useParams();
    const router = useRouter();
    const [employees, setEmployees] = useState([]);
    const [form, setForm] = useState({
        employee_code: "",
        name: "",
        tc_no: "",
        position: "",
        department: "",
        start_date: "",
        wallet_address: "",
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Sayfa ilk açıldığında çalışanları çek
    useEffect(() => {
        setLoading(true);
        fetchEmployees(companyId)
            .then((data) => {
                // Laravel Resource ise data.data içinde olabilir
                const list = Array.isArray(data) ? data : data.data || [];
                setEmployees(list);
            })
            .catch((err) => {
                setError(err.message);
                if (err.message.toLowerCase().includes("unauth")) {
                    router.push("/login");
                }
            })
            .finally(() => setLoading(false));
    }, [companyId, router]);

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;

        setError("");
        try {
            const payload = {
                employee_code: form.employee_code || null,
                name: form.name,
                surname: form.surname,
                tc_no: form.tc_no || null,
                position: form.position || null,
                department: form.department || null,
                start_date: form.start_date || null,
                wallet_address: form.wallet_address || null,
            };

            const created = await createEmployeeApi(companyId, payload);
            const item = created?.data || created;

            setEmployees((prev) => [...prev, item]);

            setForm({
                employee_code: "",
                name: "",
                tc_no: "",
                position: "",
                department: "",
                start_date: "",
                wallet_address: "",
            });
        } catch (err) {
            setError(err.message || "Kayıt sırasında bir hata oluştu.");
        }
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

            <div className="flex flex-col flex-1 min-w-0">
                <Navbar />

                <main className="flex-1 px-6 py-6 max-w-6xl w-full mx-auto space-y-6">
                    {/* Başlık / breadcrumb */}
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs text-slate-500 mb-1">
                                Şirket #{companyId} / Çalışanlar
                            </p>
                            <h1 className="text-2xl font-bold">Çalışanlar</h1>
                            <p className="text-sm text-slate-500">
                                Bu sayfadan seçili şirketin çalışanlarını yönetebilirsin.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <p className="text-xs text-red-600">{error}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Sol: Yeni çalışan formu */}
                        <div className="bg-white rounded-xl border p-4 md:col-span-1">
                            <h2 className="font-semibold mb-3 text-sm">
                                Yeni Çalışan Ekle
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div className="space-y-1">
                                        <label className="text-slate-600">Çalışan Kodu</label>
                                        <input
                                            name="employee_code"
                                            value={form.employee_code}
                                            onChange={handleChange}
                                            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                            placeholder="Örn: EMP-001"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-slate-600">Ad Soyad</label>
                                        <input
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                            placeholder="Örn: Ahmet Yılmaz"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div className="space-y-1">
                                        <label className="text-slate-600">TC Kimlik No</label>
                                        <input
                                            name="tc_no"
                                            value={form.tc_no}
                                            onChange={handleChange}
                                            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                            placeholder="11 haneli"
                                            maxLength={11}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-slate-600">İşe Başlama Tarihi</label>
                                        <input
                                            type="date"
                                            name="start_date"
                                            value={form.start_date}
                                            onChange={handleChange}
                                            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
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
                                            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                            placeholder="Örn: Yazılım Geliştirici"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-slate-600">Departman</label>
                                        <input
                                            name="department"
                                            value={form.department}
                                            onChange={handleChange}
                                            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                            placeholder="Örn: AR-GE"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1 text-sm">
                                    <label className="text-slate-600">Wallet Adresi (opsiyonel)</label>
                                    <input
                                        name="wallet_address"
                                        value={form.wallet_address}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                        placeholder="0x..."
                                    />
                                    <p className="text-[11px] text-slate-500">
                                        Boş bırakılırsa bu çalışan için şimdilik NFT mint edilmeyebilir.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-slate-900 text-white rounded py-2 text-sm hover:bg-slate-800"
                                >
                                    Kaydet
                                </button>
                            </form>

                        </div>

                        {/* Sağ: Çalışan listesi */}
                        <div className="bg-white rounded-xl border p-4 md:col-span-2">
                            <h2 className="font-semibold mb-3 text-sm">
                                Çalışan Listesi
                            </h2>

                            {loading ? (
                                <p className="text-sm text-slate-500">Yükleniyor...</p>
                            ) : employees.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    Henüz çalışan yok. Soldaki formdan ekleyebilirsin.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-xs text-slate-500">
                                                <th className="text-left py-2 pr-4">ID</th>
                                                <th className="text-left py-2 pr-4">Ad Soyad</th>
                                                <th className="text-left py-2 pr-4">Wallet</th>
                                                <th className="text-left py-2">Aksiyon</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {employees.map((e) => (
                                                <tr
                                                    key={e.id}
                                                    className="border-b last:border-0 hover:bg-slate-50"
                                                >
                                                    <td className="py-2 pr-4 text-xs text-slate-500">
                                                        #{e.id}
                                                    </td>
                                                    <td className="py-2 pr-4 font-medium">
                                                        {e.name}
                                                    </td>
                                                    <td className="py-2 pr-4 text-xs text-slate-600">
                                                        {e.wallet_address || e.wallet || "-"}
                                                    </td>
                                                    <td className="p-2 text-right space-x-2">
                                                        <button
                                                            onClick={() =>
                                                                router.push(`/companies/${companyId}/employees/${e.id}`)
                                                            }
                                                            className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                                                        >
                                                            Detay
                                                        </button>

                                                        <button
                                                            onClick={() =>
                                                                router.push(`/companies/${companyId}/employees/${e.id}/payrolls`)
                                                            }
                                                            className="text-xs px-2 py-1 rounded bg-slate-900 text-white hover:bg-slate-800"
                                                        >
                                                            Payroll&apos;lar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
