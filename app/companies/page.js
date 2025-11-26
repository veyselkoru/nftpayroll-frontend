"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/layout/Sidebar";
import Navbar from "@/app/components/layout/Navbar";
import { fetchCompanies, createCompanyApi } from "@/lib/companies";

export default function CompaniesPage() {


    const router = useRouter();
    const [companies, setCompanies] = useState([]);
    const [form, setForm] = useState({ name: "", taxNo: "" });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // İlk yüklemede companies çek
    useEffect(() => {
        setLoading(true);
        fetchCompanies()
            .then((data) => {
                // Laravel Resource ise data.data içinde olabilir
                const list = Array.isArray(data) ? data : data.data || [];
                setCompanies(list);
            })
            .catch((err) => {
                setError(err.message);
                if (err.message.toLowerCase().includes("unauth")) {
                    router.push("/login");
                }
            })
            .finally(() => setLoading(false));
    }, [router]);

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;

        setError("");
        try {
            const payload = { name: form.name };
            // Laravel Company modelinde tax_no vs varsa burada genişletirsin
            const created = await createCompanyApi(payload);
            setCompanies((prev) => [...prev, created]);
            setForm({ name: "", taxNo: "" });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-100">
            <Sidebar />

            <div className="flex flex-col flex-1 min-w-0">
                <Navbar />

                <main className="flex-1 px-6 py-6 max-w-6xl w-full mx-auto space-y-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold">Şirketler</h1>
                            <p className="text-sm text-slate-500">
                                Buradan şirketleri görüntüleyebilir ve yeni şirket ekleyebilirsin.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <p className="text-xs text-red-600">{error}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Yeni şirket formu */}
                        <div className="bg-white rounded-xl border p-4 md:col-span-1">
                            <h2 className="font-semibold mb-3 text-sm">
                                Yeni Şirket Ekle
                            </h2>
                            <form className="space-y-3" onSubmit={handleSubmit}>
                                <div className="space-y-1 text-sm">
                                    <label className="text-slate-600">Şirket Adı</label>
                                    <input
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-slate-200"
                                        placeholder="Örn: Acme A.Ş."
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

                        {/* Şirket listesi */}
                        <div className="bg-white rounded-xl border p-4 md:col-span-2">
                            <h2 className="font-semibold mb-3 text-sm">Şirket Listesi</h2>

                            {loading ? (
                                <p className="text-sm text-slate-500">Yükleniyor...</p>
                            ) : companies.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    Henüz şirket yok. Soldaki formdan ekleyebilirsin.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-xs text-slate-500">
                                                <th className="text-left py-2 pr-4">ID</th>
                                                <th className="text-left py-2 pr-4">Şirket Adı</th>
                                                <th className="text-left py-2">Aksiyon</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {companies.map((c) => (
                                                <tr
                                                    key={c.id}
                                                    className="border-b last:border-0 hover:bg-slate-50"
                                                >
                                                    <td className="py-2 pr-4 text-xs text-slate-500">
                                                        #{c.id}
                                                    </td>
                                                    <td className="py-2 pr-4 font-medium">{c.name}</td>
                                                    <td className="py-2">
                                                        <button
                                                            className="text-xs border rounded px-3 py-1 hover:bg-slate-100"
                                                            onClick={() =>
                                                                router.push(`/companies/${c.id}/employees`)
                                                            }
                                                        >
                                                            Detay / Çalışanlar
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
