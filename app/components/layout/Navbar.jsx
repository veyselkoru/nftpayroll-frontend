"use client";

import { useRouter } from "next/navigation";
import { logoutApi } from "@/lib/auth";

export default function Navbar() {
    const router = useRouter();
    const userName = "Admin Kullanıcı"; // İleride /me'den çekeriz

    const handleLogout = async () => {
        await logoutApi();
        router.replace("/login");
    };

    return (
        <header className="h-14 bg-white border-b flex items-center justify-between px-6">
            <div className="font-semibold text-lg">Dashboard</div>

            <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">{userName}</span>
                <button
                    onClick={handleLogout}
                    className="text-xs border rounded px-3 py-1 hover:bg-slate-50"
                >
                    Çıkış Yap
                </button>
            </div>
        </header>
    );
}
