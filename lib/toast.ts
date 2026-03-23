import { toast } from "sonner";

export type ApiErrorBody = { error?: string; code?: string };

export function toastFromApi(data: ApiErrorBody | undefined, fallback: string) {
  const text =
    data && typeof data.error === "string" && data.error.trim() !== ""
      ? data.error
      : fallback;
  if (data?.code === "RATE_LIMIT") {
    toast.warning(text);
    return;
  }
  toast.error(text);
}

export function toastNetworkError() {
  toast.error("Não foi possível conectar. Verifique sua internet e tente de novo.");
}
