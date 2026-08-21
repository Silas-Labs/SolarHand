/* Ephemeral toast notifications (Zustand).
   A tiny queue with auto-dismiss. The `toast.*` helper lets non-component code
   (stores, sync engine) raise messages without importing React. */

import { create } from "zustand";
import { newId } from "@/lib/util";

export type ToastKind = "info" | "success" | "error";

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: string) => void;
}

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  push(kind, message) {
    const id = newId();
    set({ toasts: [...get().toasts, { id, kind, message }] });
    const ttl = kind === "error" ? 5200 : 3000;
    window.setTimeout(() => get().dismiss(id), ttl);
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

/** Imperative helper for use outside React components. */
export const toast = {
  info: (m: string) => useToast.getState().push("info", m),
  success: (m: string) => useToast.getState().push("success", m),
  error: (m: string) => useToast.getState().push("error", m),
};
