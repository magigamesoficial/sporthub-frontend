/**
 * Modais ancorados no topo-esquerdo, com inset no md+ alinhado à área de conteúdo
 * (sidebar 14rem + 1rem de respiro — mesmo critério de LoggedInLayout e AdminLayoutShell).
 */
export const MODAL_OVERLAY_CLASS =
  "fixed inset-0 z-50 flex items-start justify-start bg-black/70 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-3 md:pb-4 md:pl-[calc(14rem+1rem)] md:pr-4";

export const MODAL_OVERLAY_SOFT_CLASS =
  "fixed inset-0 z-50 flex items-start justify-start bg-black/60 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-3 md:pb-4 md:pl-[calc(14rem+1rem)] md:pr-4";

export const MODAL_PANEL_SCROLL_CLASS =
  "w-full max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-0.75rem))] overflow-y-auto overflow-x-hidden rounded-2xl border border-white/15 shadow-xl";
