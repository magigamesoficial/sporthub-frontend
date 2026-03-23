"use client";

import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        richColors
        theme="dark"
        closeButton
        duration={5000}
        toastOptions={{
          classNames: {
            toast:
              "border border-white/10 bg-pitch-950/95 text-white shadow-xl backdrop-blur-md",
            title: "text-white",
            description: "text-slate-300",
            success: "!border-emerald-500/50",
            error: "!border-red-500/50",
            warning: "!border-amber-500/50",
            info: "!border-sky-500/50",
          },
        }}
      />
    </>
  );
}
