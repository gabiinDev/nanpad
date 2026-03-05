/**
 * Menú contextual flotante — Technical Noir.
 * Estética de terminal/IDE con fuente monoespaciada.
 */

import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  /** Emoji o carácter de texto para el icono (legacy). */
  icon?: string;
  /** Componente React de icono (preferido sobre icon). */
  faIcon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

/**
 * Menú contextual flotante con estética de terminal.
 */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Menú contextual"
      className="animate-scale-in"
      style={{
        position: "fixed",
        top: y,
        left: x,
        zIndex: 9999,
        minWidth: "180px",
        borderRadius: "8px",
        overflow: "hidden",
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border-strong)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div style={{ padding: "4px" }}>
        {items.map((item, i) => (
          <div key={i}>
            {item.separator && (
              <div style={{ height: "1px", background: "var(--color-border)", margin: "4px 0" }} />
            )}
            <button
              role="menuitem"
              disabled={item.disabled}
              onClick={() => { if (!item.disabled) { item.onClick(); onClose(); } }}
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                gap: "9px",
                padding: "8px 12px",
                borderRadius: "6px",
                textAlign: "left",
                fontSize: "14px",
                background: "transparent",
                border: "none",
                cursor: item.disabled ? "default" : "pointer",
                color: item.danger
                  ? "var(--color-priority-critical)"
                  : "var(--color-text-secondary)",
                opacity: item.disabled ? 0.35 : 1,
                transition: "all 0.1s ease",
              }}
              onMouseEnter={(e) => {
                if (!item.disabled) {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = item.danger ? "oklch(0.704 0.191 22.216 / 12%)" : "var(--color-surface-active)";
                  el.style.color = item.danger ? "var(--color-priority-critical)" : "var(--color-text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "transparent";
                el.style.color = item.danger ? "var(--color-priority-critical)" : "var(--color-text-secondary)";
              }}
            >
              {(item.faIcon ?? item.icon) && (
                <span style={{ width: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {item.faIcon ?? item.icon}
                </span>
              )}
              {item.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
