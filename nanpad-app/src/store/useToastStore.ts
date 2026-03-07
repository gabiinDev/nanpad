/**
 * Store de notificaciones toast para feedback al usuario.
 */

import { create } from "zustand";

export type ToastType = "success" | "warning" | "danger" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  /** Muestra un toast que se auto-oculta tras unos segundos. Por defecto type = "success". */
  toast: (message: string, type?: ToastType) => void;
  /** Cierra un toast por id. */
  dismiss: (id: string) => void;
}

let toastId = 0;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  toast: (message, type = "success") => {
    const id = `toast-${++toastId}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));

    setTimeout(() => {
      get().dismiss(id);
    }, 3500);
  },

  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
