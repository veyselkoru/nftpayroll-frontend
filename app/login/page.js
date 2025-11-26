"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { loginApi, getToken } from "@/lib/auth";


export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = getToken();
        if (token) {
            router.replace("/dashboard");
        }
    }, [router]);


    const change = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await loginApi(form);
            router.push("/dashboard");
        } catch (err) {
            setError(err.message || "Giriş başarısız");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
            <div className="w-full max-w-sm bg-white border rounded-2xl shadow-sm p-6">
                <h1 className="text-xl font-semibold text-center mb-2">
                    NFTPAYROLL Admin
                </h1>
                <p className="text-xs text-slate-500 text-center mb-4">
                    Yönetim paneline giriş yapın
                </p>

                {error && (
                    <p className="mb-3 text-xs text-red-600">{error}</p>
                )}

                <form className="space-y-3" onSubmit={submit}>
                    <div className="space-y-1 text-sm">
                        <label className="text-slate-600">Email</label>
                        <input
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={change}
                            className="w-full border rounded px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="space-y-1 text-sm">
                        <label className="text-slate-600">Şifre</label>
                        <input
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={change}
                            className="w-full border rounded px-3 py-2 text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 text-white rounded py-2 text-sm mt-2 disabled:opacity-60"
                    >
                        {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                    </button>
                </form>
            </div>
        </div>
    );
}
