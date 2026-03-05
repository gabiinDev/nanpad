/**
 * Icono flotante de ayuda (pie derecho) con panel contextual y overlay glass.
 * La visibilidad del icono se controla desde Ajustes (persistido en DB).
 */

import { useState, useRef, useEffect } from "react";
import type { AppRoute } from "@app/router.ts";
import { useRouteStore } from "@/store/useRouteStore.ts";
import { IconHelp, IconClose } from "@ui/icons/index.tsx";

interface HelpFloatingProps {
  /** Si false, no se muestra el icono (preferencia del usuario en Ajustes). */
  visible: boolean;
}

/** Estilos comunes para mejor legibilidad: texto más grande y separadores. */
const styles = {
  nav: "mb-4 text-sm text-[var(--color-text-secondary)]",
  kbd: "rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[0.8125rem] font-medium",
  sectionTitle: "mb-2 mt-4 text-base font-semibold text-[var(--color-text-primary)] first:mt-0",
  list: "space-y-2 text-sm text-[var(--color-text-secondary)]",
  listItem: "flex gap-2",
  separator: "my-4 border-t border-[var(--color-border)]",
  paragraph: "text-sm leading-relaxed text-[var(--color-text-secondary)]",
};

const GLOBAL_NAV = (
  <p className={styles.nav}>
    Navegación: <kbd className={styles.kbd}>H</kbd> Inicio · <kbd className={styles.kbd}>T</kbd> Tareas ·{" "}
    <kbd className={styles.kbd}>E</kbd> Explorador · <kbd className={styles.kbd}>S</kbd> Ajustes
  </p>
);

function HelpPanelContent({ route }: { route: AppRoute }) {
  if (route === "tasks") {
    return (
      <>
        {GLOBAL_NAV}
        <div className={styles.separator} />
        <h3 className={styles.sectionTitle}>Atajos de teclado</h3>
        <ul className={`${styles.list} list-none pl-0`}>
          <li className={styles.listItem}><kbd className={styles.kbd}>Ctrl+N</kbd> <span>Nueva tarea</span></li>
          <li className={styles.listItem}><kbd className={styles.kbd}>Ctrl+Z</kbd> <span>Deshacer cambio (máx. 5)</span></li>
          <li className={styles.listItem}><kbd className={styles.kbd}>Ctrl+Y</kbd> <span>Rehacer cambio</span></li>
        </ul>
        <div className={styles.separator} />
        <h3 className={styles.sectionTitle}>Interacciones</h3>
        <ul className={`${styles.list} list-disc list-inside pl-0`}>
          <li><strong className="text-[var(--color-text-primary)]">Click derecho en espacio vacío</strong> (Kanban): menú para crear tarea.</li>
          <li><strong className="text-[var(--color-text-primary)]">Click derecho en una tarea</strong> (Kanban o lista): editar, eliminar, cambiar estado.</li>
        </ul>
      </>
    );
  }
  if (route === "documents") {
    return (
      <>
        {GLOBAL_NAV}
        <div className={styles.separator} />
        <h3 className={styles.sectionTitle}>Atajos de teclado</h3>
        <ul className={`${styles.list} list-none pl-0`}>
          <li className={styles.listItem}><kbd className={styles.kbd}>Ctrl+N</kbd> <span>Nueva nota temporal</span></li>
          <li className={styles.listItem}><kbd className={styles.kbd}>Ctrl+Z</kbd> <span>Deshacer en editor</span></li>
          <li className={styles.listItem}><kbd className={styles.kbd}>Ctrl+Y</kbd> <span>Rehacer en editor</span></li>
          <li className={styles.listItem}><kbd className={styles.kbd}>Ctrl+Shift+Z</kbd> <span>Reabrir último tab cerrado</span></li>
        </ul>
        <div className={styles.separator} />
        <h3 className={styles.sectionTitle}>Interacciones</h3>
        <ul className={`${styles.list} list-disc list-inside pl-0`}>
          <li><strong className="text-[var(--color-text-primary)]">Doble clic en un archivo</strong>: lo fija en la barra de tabs (tab real).</li>
          <li><strong className="text-[var(--color-text-primary)]">En el buscador o árbol</strong>: doble clic en una carpeta la abre en el árbol del explorador.</li>
        </ul>
      </>
    );
  }
  if (route === "home") {
    return (
      <>
        <h3 className={styles.sectionTitle}>Inicio</h3>
        <p className={styles.paragraph}>
          Resumen del workspace. Usa los atajos <kbd className={styles.kbd}>H</kbd>, <kbd className={styles.kbd}>T</kbd>,{" "}
          <kbd className={styles.kbd}>E</kbd>, <kbd className={styles.kbd}>S</kbd> para navegar entre secciones.
        </p>
      </>
    );
  }
  if (route === "settings") {
    return (
      <>
        <h3 className={styles.sectionTitle}>Ajustes</h3>
        <p className={styles.paragraph}>
          Aquí puedes cambiar tema, modo rendimiento, vista por defecto de tareas y mostrar u ocultar este icono de ayuda.
        </p>
      </>
    );
  }
  return null;
}

const ROUTE_LABELS: Record<AppRoute, string> = {
  home: "Inicio",
  tasks: "Tareas",
  documents: "Explorador",
  settings: "Ajustes",
};

export function HelpFloating({ visible }: HelpFloatingProps) {
  const route = useRouteStore((s) => s.route);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      const btn = document.querySelector("[data-help-toggle]");
      if (btn?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (!visible) return null;

  return (
    <>
      {/* Overlay tipo glass cuando el panel está abierto: click cierra el panel */}
      {open && (
        <button
          type="button"
          aria-label="Cerrar ayuda"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[99] cursor-default backdrop-blur-sm bg-[var(--color-surface)]/50 transition-opacity"
        />
      )}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col-reverse items-end gap-3">
        <button
          type="button"
          data-help-toggle
          onClick={() => setOpen((v) => !v)}
          aria-label="Ayuda"
          aria-expanded={open}
          className="animate-heartbeat flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-accent)] shadow-[var(--shadow-md)] transition-colors hover:bg-[var(--color-surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <IconHelp size={22} />
        </button>
        {open && (
          <div
            ref={panelRef}
            className="animate-scale-in w-80 max-w-[calc(100vw-2.5rem)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/95 shadow-[var(--shadow-xl)] backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                Ayuda — {ROUTE_LABELS[route]}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar ayuda"
                className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <IconClose size={14} />
              </button>
            </div>
            <div className="max-h-[min(60vh,28rem)] overflow-y-auto px-5 py-4">
              <HelpPanelContent route={route} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
