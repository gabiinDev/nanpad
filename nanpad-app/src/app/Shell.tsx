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
      className="flex h-full w-full overflow-hidden"
      style={{ background: "var(--color-surface)" }}
      onContextMenu={(e) => { e.preventDefault(); }}
    >
      {/* ─── Sidebar ultra-thin ───────────────────────────────────────── */}
      <aside
        style={{
          width: "52px",
          background: "var(--color-surface-2)",
          borderRight: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
        className="relative flex h-full flex-col items-center py-4 shrink-0"
      >
        {/* Logo con glow pulsante al hover + tooltip */}
        <div
          className="group relative mb-6 flex items-center justify-center cursor-pointer"
          style={{ color: "var(--color-accent)" }}
        >
          <div className="transition-all duration-300 hover:scale-110 hover:drop-shadow-[0_0_8px_var(--color-accent)]">
            <IconLogo size={26} />
          </div>
          <span
            className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5 z-50"
            style={{
              fontSize: "13px",
              background: "var(--color-surface-active)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border-strong)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            Nanpad dice: ¡gracias por usarme! ❤️
          </span>
        </div>

        {/* Navegación */}
        <nav className="flex flex-1 flex-col items-center gap-1" aria-label="Navegación">
          {NAV_ITEMS.map(({ route: r, label, shortcut, Icon }) => {
            const active = route === r;
            return (
              <div key={r} className="relative w-full flex justify-center items-center">
                {/* Indicador activo — línea vertical izquierda */}
                {active && (
                  <span
                    className="absolute left-0 w-0.5 h-6 rounded-r-full animate-fade-up"
                    style={{ background: "var(--color-accent)", boxShadow: "0 0 8px var(--color-accent)" }}
                  />
                )}
                <button
                  onClick={() => { setRoute(r); }}
                  title={`${label} [${shortcut}]`}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className="group relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200"
                  style={{
                    background: active ? "var(--color-accent-subtle)" : "transparent",
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
                  {/* Tooltip */}
                  <span
                    className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-all duration-150 group-hover:translate-x-0.5 z-50"
                    style={{
                      fontSize: "13px",
                      background: "var(--color-surface-active)",
                      color: "var(--color-text-primary)",
                      border: "1px solid var(--color-border-strong)",
                      boxShadow: "var(--shadow-lg)",
                    }}
                  >
                    {label}
                    <span
                      className="ml-2 rounded px-1"
                      style={{ fontSize: "11px", background: "var(--color-surface)", color: "var(--color-text-muted)" }}
                    >
                      {shortcut}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </nav>

        {/* Acciones inferiores */}
        <div className="flex flex-col items-center gap-1">
          {/* Toggle tema */}
          <button
            onClick={theme.toggleTheme}
            title={isDark ? "Modo claro" : "Modo oscuro"}
            aria-label={isDark ? "Modo claro" : "Modo oscuro"}
            className="group relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--color-priority-high)";
              (e.currentTarget as HTMLElement).style.background = "var(--color-surface-active)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <span className="transition-transform duration-300 group-hover:rotate-45 block">
              {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
            </span>
          </button>

          {/* Ajustes */}
          <div className="relative w-full flex justify-center items-center">
            {route === "settings" && (
              <span
                className="absolute left-0 w-0.5 h-6 rounded-r-full"
                style={{ background: "var(--color-accent)", boxShadow: "0 0 8px var(--color-accent)" }}
              />
            )}
            <button
              onClick={() => { setRoute("settings"); }}
              title="Ajustes [S]"
              aria-label="Ajustes"
              className="group relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200"
              style={{
                background: route === "settings" ? "var(--color-accent-subtle)" : "transparent",
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

      {/* ─── Área de contenido ───────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header — breadcrumb + buscador contextual */}
        <header
          className="flex h-10 shrink-0 items-center gap-4 px-5"
          style={{
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface-2)",
          }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 shrink-0" style={{ fontSize: "13px" }}>
            <span style={{ color: "var(--color-text-muted)" }}>nanpad /</span>
            <span style={{ color: "var(--color-text-secondary)" }}>{meta.sub} /</span>
            <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
              {meta.label}
            </span>
          </div>

          {/* Separador */}
          <div
            style={{
              width: "1px",
              height: "16px",
              background: "var(--color-border)",
              flexShrink: 0,
            }}
          />

          {/* Zona explorador: botón Nueva nota a la izquierda del buscador (mismo estilo que Nueva tarea, menos alto) */}
          <div className="flex flex-1 items-center min-w-0 gap-3">
            {route === "documents" && (
              <button
                type="button"
                onClick={() => void createTempTab()}
                title="Nueva nota temporal (Ctrl+N)"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "3px 12px",
                  borderRadius: "7px",
                  border: "1px solid var(--color-accent)",
                  background: "var(--color-accent-subtle)",
                  color: "var(--color-accent)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  const t = e.currentTarget as HTMLElement;
                  t.style.background = "var(--color-surface-hover)";
                  t.style.borderColor = "var(--color-accent)";
                }}
                onMouseLeave={(e) => {
                  const t = e.currentTarget as HTMLElement;
                  t.style.background = "var(--color-accent-subtle)";
                  t.style.borderColor = "var(--color-accent)";
                }}
              >
                <IconPlus size={12} />
                <span>Nueva nota</span>
              </button>
            )}
            {/* Buscador centrado en el espacio restante */}
            <div className="flex flex-1 items-center justify-center min-w-0">
              {route === "documents" && <ExplorerSearchBar />}
            </div>
          </div>

          {/* Indicador de estado */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--color-status-done)" }}
            />
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
              activo
            </span>
          </div>
        </header>

        {/* Vista activa con animación al cambiar */}
        <div key={route} className="animate-fade-up flex-1 overflow-hidden">
          {route === "home"      && <HomePage />}
          {route === "tasks"     && <TasksPage />}
          {route === "documents" && <ExplorerPage isDark={isDark} />}
          {route === "settings"  && <SettingsPage theme={theme} />}
        </div>
      </main>
    </div>
  );
}
