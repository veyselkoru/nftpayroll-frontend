"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, meApi, clearToken } from "@/lib/auth";

export function useAuthGuard() {
    const router = useRouter();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const token = getToken();

        // token yok → direkt login'e at
        if (!token) {
            router.replace("/login");
            return;
        }

        // token var → /me ile backend doğrulasın
        meApi()
            .then(() => {
                setReady(true);
            })
            .catch(() => {
                clearToken();
                router.replace("/login");
            });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return ready;
}
