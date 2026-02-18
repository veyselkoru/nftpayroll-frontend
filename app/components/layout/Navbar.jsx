"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Workflow,
  ClipboardList,
  ShieldCheck,
  Wallet,
  DatabaseZap,
  LogOut,
} from "lucide-react";
import { logoutApi, meApi } from "@/lib/auth";
import { extractUserFromMe } from "@/lib/user";

const profileLinks = [
  { label: "İşlem Merkezi", href: "/modules/operations-center", icon: Workflow },
  { label: "Onay Akışları", href: "/modules/approvals", icon: ClipboardList },
  { label: "Uyumluluk ve Denetim", href: "/modules/compliance", icon: ShieldCheck },
  { label: "Cüzdan Yönetimi", href: "/modules/wallets", icon: Wallet },
  { label: "Toplu İşlemler", href: "/modules/bulk-operations", icon: DatabaseZap },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("Kullanıcı");
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current || menuRef.current.contains(event.target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let canceled = false;
    meApi()
      .then((resp) => {
        if (canceled) return;
        const user = extractUserFromMe(resp) || {};
        const fullName =
          [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
          user.name ||
          "Kullanıcı";
        setUserName(fullName);
      })
      .catch(() => {});

    return () => {
      canceled = true;
    };
  }, []);

  const handleLogout = async () => {
    await logoutApi();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
      <div className="min-w-0">
        <div className="text-xs text-gray-500">NFTPAYROLL Console</div>
        <div className="font-semibold text-base text-gray-900 truncate">Dashboard</div>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-slate-50 transition"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#111b3a] text-xs font-semibold text-white">
            {userName.slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden sm:block text-left">
            <span className="block text-[11px] text-slate-500 leading-4">Hoş geldin</span>
            <span className="block text-sm font-medium text-slate-800 leading-4">{userName}</span>
          </span>
          <ChevronDown
            className={[
              "h-4 w-4 text-slate-500 transition-transform",
              open ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>

        {open ? (
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
            {profileLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={[
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                  pathname.startsWith(item.href)
                    ? "bg-[#e9edf7] text-[#111b3a] font-medium"
                    : "text-slate-700 hover:bg-slate-100",
                ].join(" ")}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}

            <div className="my-1 h-px bg-slate-200" />

            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition inline-flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
