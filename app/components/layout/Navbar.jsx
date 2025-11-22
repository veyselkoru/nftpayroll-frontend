"use client";

export default function Navbar() {
    // Şimdilik fake kullanıcı ismi, auth ekleyince burayı gerçek yaparız
    const userName = "Admin Kullanıcı";

    return (
        <header className="h-14 bg-white border-b flex items-center justify-between px-6">
            <div className="font-semibold text-lg">Dashboard</div>

            <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">{userName}</span>
                <button className="text-xs border rounded px-3 py-1 hover:bg-slate-50">
                    Çıkış Yap
                </button>
            </div>
        </header>
    );
}
