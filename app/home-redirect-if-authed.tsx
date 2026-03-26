"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TOKEN_STORAGE_KEY } from "@/lib/api";

/** Na landing: se já existir sessão, entra direto no painel inicial. */
export function HomeRedirectIfAuthed() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(TOKEN_STORAGE_KEY)) {
      router.replace("/dashboard");
    }
  }, [router]);

  return null;
}
