"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
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
        <div className="min-h-screen ta-shell flex items-center justify-center px-4">
            <div className="w-full max-w-sm ta-card rounded-2xl shadow-sm p-6">
                <div className="mb-4 flex justify-center">
                    <Image
                        src="/nftpayroll-logo.svg"
                        alt="NFTPayroll Logo"
                        width={220}
                        height={50}
                        priority
                        className="h-auto w-auto max-w-[220px]"
                    />
                </div>
                <p className="text-xs text-slate-500 text-center mb-4">
                    Yönetim paneline giriş yapın
                </p>

                {error && (
                    <p className="mb-3 text-xs text-red-600">{error}</p>
                )}

                <form className="space-y-3" onSubmit={submit}>
                    <div className="space-y-1 text-sm">
                        <label className="text-gray-600">Email</label>
                        <input
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={change}
                            className="ta-input"
                        />
                    </div>

                    <div className="space-y-1 text-sm">
                        <label className="text-gray-600">Şifre</label>
                        <input
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={change}
                            className="ta-input"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="ta-btn-primary mt-2 w-full disabled:opacity-60"
                    >
                        {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                    </button>
                </form>
            </div>
        </div>
    );
}
