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
        name: "",
        surname: "",
        wallet_address: "",   // backend alan adına göre ayarla
        position: "",
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
                name: form.name,
                surname: form.surname,
                wallet_address: form.wallet_address, // backend’e göre burayı değiştir
                // position backend'de varsa buraya ekleyebilirsin
            };

            const created = await createEmployeeApi(companyId, payload);
            setEmployees((prev) => [...prev, created]);
            setForm({ name: "", surname: "", wallet_address: "", position: "" });
        } catch (err) {
            setError(err.message);
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

                            <form className="space-y-3" onSubmit={handleSubmit}>
                                <div className="space-y-1 text-sm">
                                    <label className="text-slate-600">Ad</label>
                                    <input
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                        placeholder="Örn: Ali"
                                    />
                                </div>

                                <div className="space-y-1 text-sm">
                                    <label className="text-slate-600">Soyad</label>
                                    <input
                                        name="surname"
                                        value={form.surname}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                        placeholder="Örn: Yılmaz"
                                    />
                                </div>

                                <div className="space-y-1 text-sm">
                                    <label className="text-slate-600">Wallet Adresi</label>
                                    <input
                                        name="wallet_address"
                                        value={form.wallet_address}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                        placeholder="0x..."
                                    />
                                </div>

                                {/* Eğer backend’de position alanı varsa burayı da API’ye ekleyebilirsin */}
                                <div className="space-y-1 text-sm">
                                    <label className="text-slate-600">
                                        Pozisyon (sadece UI, şimdilik opsiyonel)
                                    </label>
                                    <input
                                        name="position"
                                        value={form.position}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                        placeholder="Örn: Yazılım Geliştirici"
                                    />
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
                                                    <td className="py-2">
                                                        <div className="flex flex-wrap gap-1">
                                                            <button
                                                                className="text-xs border rounded px-3 py-1 hover:bg-slate-100"
                                                                onClick={() =>
                                                                    router.push(
                                                                        `/companies/${companyId}/employees/${e.id}/payrolls`
                                                                    )
                                                                }
                                                            >
                                                                Payrolllar
                                                            </button>
                                                            <button
                                                                className="text-xs border rounded px-3 py-1 hover:bg-slate-100"
                                                                onClick={() =>
                                                                    router.push(
                                                                        `/companies/${companyId}/employees/${e.id}/nfts`
                                                                    )
                                                                }
                                                            >
                                                                NFT&apos;ler
                                                            </button>
                                                        </div>
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
