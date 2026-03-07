/**
 * Componente de notificaciones toast para feedback al usuario.
 * Tipos: success, warning, danger, info — con icono y estilos coherentes.
 */

import type { ToastType } from "@/store/useToastStore.ts";
import { useToastStore } from "@/store/useToastStore.ts";
import { IconCheck, IconWarning, IconClose, IconInfo } from "@ui/icons/index.tsx";

const TOAST_CONFIG: Record<
  ToastType,
  { icon: React.ReactNode; borderColor: string; bgColor: string; iconColor: string }
> = {
  success: {
    icon: <IconCheck size={14} />,
    borderColor: "var(--color-status-done)",
    bgColor: "var(--color-surface-2)",
    iconColor: "var(--color-status-done)",
  },
  warning: {
    icon: <IconWarning size={14} />,
    borderColor: "var(--color-priority-high)",
    bgColor: "var(--color-surface-2)",
    iconColor: "var(--color-priority-high)",
  },
  danger: {
    icon: <IconClose size={14} />,
    borderColor: "var(--color-priority-critical)",
    bgColor: "var(--color-surface-2)",
    iconColor: "var(--color-priority-critical)",
  },
  info: {
    icon: <IconInfo size={14} />,
    borderColor: "var(--color-status-in-progress)",
    bgColor: "var(--color-surface-2)",
    iconColor: "var(--color-status-in-progress)",
  },
};

/** Contenedor global de toasts, posicionado en la esquina superior derecha. */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-6 top-6 z-[9999] flex flex-col gap-2"
      style={{ left: "auto" }}
      role="region"
      aria-label="Notificaciones"
    >
      {toasts.map((t) => {
        const config = TOAST_CONFIG[t.type];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className="pointer-events-auto flex animate-fade-up items-center gap-3 rounded-lg border px-4 py-3 text-left shadow-lg transition-all hover:opacity-90 min-w-[16rem] max-w-sm"
            style={{
              borderColor: "var(--color-border)",
              borderLeftWidth: "4px",
              borderLeftColor: config.borderColor,
              background: config.bgColor,
              color: "var(--color-text-primary)",
            }}
          >
            <span
              className="flex shrink-0 items-center justify-center"
              style={{ color: config.iconColor }}
              aria-hidden
            >
              {config.icon}
            </span>
            <span className="flex-1 text-sm font-medium">{t.message}</span>
          </button>
        );
      })}
    </div>
  );
}
