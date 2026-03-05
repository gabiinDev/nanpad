/**
 * Shell de NANPAD — "Technical Noir" layout.
 * Sidebar ultra-thin con indicador de ruta animado + header minimalista.
 */

import type { AppRoute } from "./router.ts";
import { useRouteStore } from "@/store/useRouteStore.ts";
import { useTheme } from "./useTheme.ts";
import {
  IconHome,
  IconTasks,
  IconDocument,
  IconSettings,
  IconMoon,
  IconSun,
  IconLogo,
} from "@ui/icons/index.tsx";
import HomePage from "@features/home/HomePage.tsx";
import TasksPage from "@features/tasks/TasksPage.tsx";
import ExplorerPage from "@features/explorer/ExplorerPage.tsx";
import SettingsPage from "@features/settings/SettingsPage.tsx";
import { ExplorerSearchBar } from "@features/explorer/components/ExplorerSearchBar.tsx";
import { useExplorerStore } from "@/store/useExplorerStore.ts";
import { IconPlus } from "@ui/icons/index.tsx";

interface NavItem {
  route: AppRoute;
  label: string;
  shortcut: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
}

const NAV_ITEMS: NavItem[] = [
  { route: "home",      label: "Inicio",     shortcut: "H", Icon: IconHome },
  { route: "tasks",     label: "Tareas",     shortcut: "T", Icon: IconTasks },
  { route: "documents", label: "Explorador", shortcut: "E", Icon: IconDocument },
];

const ROUTE_META: Record<AppRoute, { label: string; sub: string }> = {
  home:      { label: "inicio",     sub: "resumen" },
  tasks:     { label: "tareas",     sub: "workspace" },
  documents: { label: "explorador", sub: "archivos" },
  settings:  { label: "ajustes",    sub: "sistema" },
};

/**
 * Shell principal de la aplicación.
 */
export default function Shell() {
  const { route, setRoute } = useRouteStore();
  const theme = useTheme();
  const isDark = theme.theme === "dark";
  const createTempTab = useExplorerStore((s) => s.createTempTab);
  const meta = ROUTE_META[route];

  return (
    <div
      className="flex h-full w-full overflow-hidden bg-[var(--color-surface)]"
      onContextMenu={(e) => { e.preventDefault(); }}
    >
      {/* Sidebar: ancho fijo en rem, touch targets mínimos 44px */}
      <aside
        className="relative flex h-full w-[3.25rem] shrink-0 flex-col items-center border-r border-[var(--color-border)] bg-[var(--color-surface-2)] py-4 shadow-[var(--shadow-sm)]"
      >
        {/* Logo con glow al hover + tooltip */}
        <div className="group relative mb-6 flex cursor-pointer items-center justify-center text-[var(--color-accent)]">
          <div className="transition-all duration-300 hover:scale-110 hover:drop-shadow-[0_0_8px_var(--color-accent)]">
            <IconLogo size={26} />
          </div>
          <span
            className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-active)] px-2.5 py-1.5 text-[0.8125rem] text-[var(--color-text-primary)] opacity-0 shadow-[var(--shadow-lg)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
          >
            Nanpad dice: ¡gracias por usarme! ❤️
          </span>
        </div>

        {/* Navegación: activo = borde izquierdo en el botón */}
        <nav className="flex flex-1 flex-col items-center gap-0.5" aria-label="Navegación">
          {NAV_ITEMS.map(({ route: r, label, shortcut, Icon }) => {
            const active = route === r;
            return (
              <div key={r} className="flex w-full justify-center">
                <button
                  type="button"
                  onClick={() => { setRoute(r); }}
                  title={`${label} [${shortcut}]`}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className="group relative flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-lg border-l-2 transition-all duration-200"
                  style={{
                    background: active ? "var(--color-accent-subtle)" : "transparent",
                    borderLeftColor: active ? "var(--color-accent)" : "transparent",
                    color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "var(--color-surface-active)";
                      (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
                    }
                  }}
                >
                  <Icon size={16} />
                  <span
                    className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-active)] px-2.5 py-1.5 text-[0.8125rem] text-[var(--color-text-primary)] opacity-0 shadow-[var(--shadow-lg)] transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100"
                  >
                    {label}
                    <span className="ml-2 rounded bg-[var(--color-surface)] px-1 text-[0.6875rem] text-[var(--color-text-muted)]">
                      {shortcut}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </nav>

        {/* Acciones inferiores: tema + ajustes (touch targets 44px) */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={theme.toggleTheme}
            title={isDark ? "Modo claro" : "Modo oscuro"}
            aria-label={isDark ? "Modo claro" : "Modo oscuro"}
            className="group relative flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-all duration-200 hover:bg-[var(--color-surface-active)] hover:text-[var(--color-priority-high)]"
          >
            <span className="block transition-transform duration-300 group-hover:rotate-45">
              {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
            </span>
          </button>
          <div className="flex w-full justify-center">
            <button
              type="button"
              onClick={() => { setRoute("settings"); }}
              title="Ajustes [S]"
              aria-label="Ajustes"
              className="group relative flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-lg border-l-2 transition-all duration-200"
              style={{
                background: route === "settings" ? "var(--color-accent-subtle)" : "transparent",
                borderLeftColor: route === "settings" ? "var(--color-accent)" : "transparent",
                color: route === "settings" ? "var(--color-accent)" : "var(--color-text-muted)",
              }}
              onMouseEnter={(e) => {
                if (route !== "settings") {
                  (e.currentTarget as HTMLElement).style.background = "var(--color-surface-active)";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (route !== "settings") {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
                }
              }}
            >
              <IconSettings size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Área de contenido: layout fluid, responsive header */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className="flex h-11 shrink-0 flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 md:gap-4 md:px-5"
        >
          {/* Breadcrumb: oculto en ventanas muy estrechas */}
          <div className="flex shrink-0 items-center gap-1.5 text-[0.8125rem]">
            <span className="text-[var(--color-text-muted)]">nanpad /</span>
            <span className="text-[var(--color-text-secondary)]">{meta.sub} /</span>
            <span className="font-medium text-[var(--color-text-primary)]">{meta.label}</span>
          </div>

          <div className="h-4 w-px shrink-0 bg-[var(--color-border)]" />

          {/* Zona explorador: botón + buscador, flex fluid */}
          <div className="flex min-w-0 flex-1 basis-0 items-center gap-2 md:gap-3">
            {route === "documents" && (
              <button
                type="button"
                onClick={() => void createTempTab()}
                title="Nueva nota temporal (Ctrl+N)"
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)] transition-all duration-150 hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-hover)]"
              >
                <IconPlus size={12} />
                <span>Nueva nota</span>
              </button>
            )}
            <div className="flex min-w-0 flex-1 items-center justify-center">
              {route === "documents" && <ExplorerSearchBar />}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-status-done)]" />
            <span className="text-xs text-[var(--color-text-muted)]">activo</span>
          </div>
        </header>

        {/* Vista activa: min-h-0 para que el contenido no desborde (scroll interno correcto) */}
        <div key={route} className="animate-fade-up min-h-0 flex-1 overflow-hidden">
          {route === "home"      && <HomePage />}
          {route === "tasks"     && <TasksPage />}
          {route === "documents" && <ExplorerPage isDark={isDark} />}
          {route === "settings"  && <SettingsPage theme={theme} />}
        </div>
      </main>
    </div>
  );
}
