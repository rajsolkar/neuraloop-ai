import { create } from "zustand";
import { makeId } from "@/lib/utils";

export type ToastTone = "default" | "success" | "error" | "info";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastItem[];
  toast: (title: string, opts?: Partial<ToastItem>) => void;
  dismiss: (id: string) => void;
}

const TOAST_DURATION = 3200;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  toast: (title, opts) => {
    const id = makeId("t");
    const item: ToastItem = {
      id,
      title,
      tone: opts?.tone ?? "default",
      description: opts?.description,
    };
    set((state) => ({ toasts: [...state.toasts.slice(-3), item] }));
    window.setTimeout(() => get().dismiss(id), TOAST_DURATION);
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));